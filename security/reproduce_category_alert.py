"""Replay the ZAP boolean payload pair as literal category names on disposable data."""

import json, subprocess, urllib.request, urllib.error
from pathlib import Path

root = Path(__file__).resolve().parents[1]
# Remove only the two scanner-owned reproduction categories so replay is repeatable.
code = """from django.conf import settings
from expenses.models import Category
assert settings.DATABASES['default']['NAME']=='expense_testing'
Category.objects.filter(user__username='scanner',name__in=['ZAP AND 1=1 --','ZAP AND 1=2 --']).delete()
"""
subprocess.run(
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
    check=True,
    capture_output=True,
)
env = dict(
    line.split("=", 1)
    for line in (root / ".zap.env").read_text().splitlines()
    if "=" in line
)
results = []
for name in [
    "ZAP AND 1=1 -- ",
    "ZAP AND 1=2 -- ",
    "ZAP AND 1=1 -- ",
    "ZAP AND 1=2 -- ",
]:
    req = urllib.request.Request(
        "http://127.0.0.1:18080/api/categories/",
        data=json.dumps({"name": name, "type": "EXPENSE"}).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": env["ZAP_AUTH_HEADER_VALUE"],
        },
    )
    try:
        response = urllib.request.urlopen(req)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body = json.load(response)
        results.append(
            {
                "name": name,
                "status": response.status,
                "stored_name": body.get("name"),
                "error": body.get("fields"),
            }
        )
assert [r["status"] for r in results] == [201, 201, 400, 400], results
report = {
    "results": results,
    "conclusion": "Both predicates stored as literal names; both duplicates rejected. No boolean-dependent SQL behavior reproduced. See parameter-binding regression tests.",
}
(root / "reports/security/category-alert-replay.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
print(json.dumps(report, indent=2))
