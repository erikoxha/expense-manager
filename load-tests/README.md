# k6: authenticated load testing

Start the isolated stack using docs/testing/BACKEND.md, then from the repository root:

```sh
docker compose -f docker-compose.testing.yml exec -T backend python manage.py shell -c "exec(open('/tooling/seed_testing.py').read())"
python3 load-tests/run.py smoke
python3 load-tests/run.py load
```

The runner uses a digest-pinned official k6 image and only the dedicated Docker network. Twenty synthetic users have independent categories and budgets. Each iteration requests a summary, creates a transaction, reads it, changes its amount, checks budget spending, deletes it, and requests a filtered list. Real JSON/status assertions supplement HTTP error metrics. Setup authenticates once per user; this is not a login-load test. Each virtual user pauses 0.4 seconds per iteration.

Smoke: 2 virtual users for 10 seconds. Load: ramp to5 over15s, to20 over30s, hold20 for30s, ramp down over15s, with10s graceful completion. Tokens normally expire after5minutes; this workload stays within that window.

Declared gates: HTTP p95 below500ms, HTTP failures below1%, checks at least99%. A failing threshold exits nonzero. Results and console logs go to reports/load/. JSON includes thresholds and counters. In k6's http_req_failed metric, `passes` counts the true/error observations; do not confuse it with successful business checks.

p95 means 95% of observed request durations were at or below that value. It is not the slowest response, an average, or browser render time. Results include setup HTTP requests. This is a small local workload with a warm app and small database, not a capacity limit, internet SLA, spike, soak or stress-to-failure test. Run scans separately so they do not distort latency. Record environment/source hashes with every report. See docs/testing/RESULTS.md for actual measurements.

Official reference: https://grafana.com/docs/k6/latest/using-k6/thresholds/
