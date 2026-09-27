import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
const base = __ENV.BASE_URL || 'http://frontend';
const profile = __ENV.PROFILE || 'smoke';
const users = Number(__ENV.LOAD_USERS || 20);
export const options = {
  scenarios: profile === 'load'
    ? { finance: { executor: 'ramping-vus', startVUs: 0, stages: [{duration:'15s',target:5},{duration:'30s',target:20},{duration:'30s',target:20},{duration:'15s',target:0}], gracefulRampDown:'10s' } }
    : { finance: {executor:'constant-vus',vus:2,duration:'10s'} },
  thresholds: { http_req_failed:['rate<0.01'], http_req_duration:['p(95)<500'], checks:['rate>=0.99'] },
};
function request(method,path,body,token,name) {
  return http.request(method,base+'/api'+path,body === null ? null : JSON.stringify(body),{headers:{'Content-Type':'application/json',...(token ? {Authorization:'Bearer '+token}:{})},tags:{name}});
}
export function setup() {
  if (!__ENV.LOAD_PASSWORD) throw new Error('LOAD_PASSWORD is required');
  const sessions=[];
  for(let index=1;index<=users;index++){
    const login=request('POST','/auth/login/',{username:`load_${index}`,password:__ENV.LOAD_PASSWORD},null,'login');
    if(login.status!==200)throw new Error(`Load login failed: HTTP ${login.status}`);
    const token=login.json('access');
    const categories=request('GET','/categories/',null,token,'categories');
    const category=categories.json('results').find(c=>c.type==='EXPENSE');
    sessions.push({token,category:category.id});
  }
  return sessions;
}
export default function(sessions){
  const session=sessions[(exec.vu.idInTest-1)%sessions.length];
  const {token,category}=session;
  const summary=request('GET','/statistics/summary/',null,token,'summary');
  check(summary,{'summary is 200 with money strings':r=>r.status===200 && typeof r.json('balance')==='string'});
  const created=request('POST','/transactions/',{category,type:'EXPENSE',amount:'1.25',date:'2026-09-15',description:`Load VU ${exec.vu.idInTest}`},token,'create transaction');
  check(created,{'create persists exact amount':r=>r.status===201 && r.json('amount')==='1.25'});
  if(created.status===201){
    const id=created.json('id');
    const read=request('GET',`/transactions/${id}/`,null,token,'read transaction');
    check(read,{'read your own created transaction':r=>r.status===200 && r.json('id')===id});
    const update=request('PATCH',`/transactions/${id}/`,{amount:'2.50'},token,'update transaction');
    check(update,{'update preserves exact amount':r=>r.status===200&&r.json('amount')==='2.50'});
    const budgets=request('GET','/statistics/budgets/',null,token,'budget statistics');
    check(budgets,{'budget reflects this users expense':r=>r.status===200&&r.json().some(b=>b.category===category&&Number(b.progress.spent)>=2.5)});
    const removed=request('DELETE',`/transactions/${id}/`,null,token,'delete transaction');
    check(removed,{'delete succeeds':r=>r.status===204});
  }
  const filtered=request('GET',`/transactions/?type=EXPENSE&category=${category}&min_amount=0.01`,null,token,'filtered transactions');
  check(filtered,{'filter returns a paginated list':r=>r.status===200&&Array.isArray(r.json('results'))});
  sleep(0.4);
}
export function handleSummary(data){
  const metrics={};
  for(const [name,metric] of Object.entries(data.metrics))metrics[name]={type:metric.type,values:metric.values,thresholds:metric.thresholds};
  const safe={profile,generated_at:new Date().toISOString(),metrics,root_group:data.root_group};
  return {[`/reports/${profile}.json`]:JSON.stringify(safe,null,2),stdout:JSON.stringify({profile,http_req_duration:metrics.http_req_duration,http_req_failed:metrics.http_req_failed,checks:metrics.checks},null,2)+'\n'};
}
