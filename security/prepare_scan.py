"""Generate scanner-only bearer token and a bounded OpenAPI scan specification."""

import json, subprocess, os
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / "reports" / "security"
out.mkdir(parents=True, exist_ok=True)
code = """import json
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from expenses.models import Category,Transaction,Budget
assert settings.DATABASES['default']['NAME']=='expense_testing'
u=get_user_model().objects.get(username='scanner')
t=AccessToken.for_user(u);t.set_exp(lifetime=timedelta(minutes=60))
print(json.dumps({'token':str(t),'category':Category.objects.filter(user=u).first().id,'transaction':Transaction.objects.filter(user=u).first().id,'budget':Budget.objects.filter(user=u).first().id}))
"""
result = subprocess.run(
    [
        "docker",
        "compose",
        "-f",
        "docker-compose.testing.yml",
        "exec",
        "-T",
        "backend",
        "python",
        "manage.py",
        "shell",
        "-c",
        code,
    ],
    cwd=root,
    capture_output=True,
    text=True,
    check=True,
)
values = json.loads(result.stdout.strip().splitlines()[-1])
secret = root / ".zap.env"
secret.write_text(
    "ZAP_AUTH_HEADER=Authorization\nZAP_AUTH_HEADER_SITE=frontend\nZAP_AUTH_HEADER_VALUE=Bearer "
    + values["token"]
    + "\n"
)
secret.chmod(0o600)


def operation(method, properties=None):
    op = {
        "responses": {
            "200": {"description": "Success"},
            "400": {"description": "Validation error"},
            "401": {"description": "Authentication required"},
            "404": {"description": "Missing record"},
        }
    }
    if properties:
        op["requestBody"] = {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {"type": "object", "properties": properties}
                }
            },
        }
    return op


paths = {}
for name in [
    "auth/me",
    "statistics/summary",
    "statistics/expenses-by-category",
    "statistics/income-by-category",
    "statistics/monthly",
    "statistics/budgets",
]:
    paths["/api/" + name + "/"] = {"get": operation("get")}
fields = {
    "categories": {
        "name": {"type": "string", "example": "Scanner category"},
        "type": {"type": "string", "example": "EXPENSE"},
    },
    "transactions": {
        "category": {"type": "integer", "example": values["category"]},
        "type": {"type": "string", "example": "EXPENSE"},
        "amount": {"type": "string", "example": "1.00"},
        "description": {"type": "string", "example": "Scan record"},
        "date": {"type": "string", "format": "date", "example": "2026-09-15"},
    },
    "budgets": {
        "category": {"type": "integer", "example": values["category"]},
        "amount": {"type": "string", "example": "100.00"},
        "start_date": {"type": "string", "format": "date", "example": "2026-09-01"},
        "end_date": {"type": "string", "format": "date", "example": "2026-09-30"},
    },
}
for plural, properties in fields.items():
    paths["/api/" + plural + "/"] = {
        "get": operation("get"),
        "post": operation("post", properties),
    }
    pk = values[
        {"categories": "category", "transactions": "transaction", "budgets": "budget"}[
            plural
        ]
    ]
    paths[f"/api/{plural}/{pk}/"] = {
        "get": operation("get"),
        "patch": operation("patch", properties),
        "put": operation("put", properties),
    }
# DELETE is verified by targeted API tests and omitted from the scan to preserve fixtures.
paths["/api/transactions/"]["get"]["parameters"] = [
    {"name": name, "in": "query", "schema": {"type": "string"}, "example": value}
    for name, value in [
        ("search", "Scan"),
        ("category", str(values["category"])),
        ("type", "EXPENSE"),
        ("start_date", "2026-09-01"),
        ("end_date", "2026-09-30"),
        ("min_amount", "0.01"),
        ("max_amount", "100"),
    ]
]
spec = {
    "openapi": "3.0.3",
    "info": {"title": "Expense Manager authenticated scan surface", "version": "1.0"},
    "servers": [{"url": "http://frontend"}],
    "paths": paths,
}
(out / "openapi.json").write_text(json.dumps(spec, indent=2) + "\n")
# Verify authenticated access without printing the credential.
import urllib.request

req = urllib.request.Request(
    "http://127.0.0.1:18080/api/auth/me/",
    headers={"Authorization": "Bearer " + values["token"]},
)
with urllib.request.urlopen(req) as response:
    identity = json.load(response)
    assert identity["username"] == "scanner"
(out / "auth-preflight.json").write_text(
    json.dumps(
        {
            "status": 200,
            "user": "scanner",
            "lifetime_minutes": 60,
            "note": "Scanner-only token in an isolated database; production access lifetime remains five minutes.",
        },
        indent=2,
    )
    + "\n"
)
print(
    "Prepared scan definition and verified scanner authentication; token saved only in ignored .zap.env."
)
