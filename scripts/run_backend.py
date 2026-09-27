"""Run reproducible backend tests and enforce separate line/branch gates."""

import os, sys, subprocess, json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
env = os.environ.copy()
if (root / ".testing.env").exists():
    for line in (root / ".testing.env").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            env.setdefault(key, value)
env.setdefault("POSTGRES_HOST", "127.0.0.1")
env.setdefault("POSTGRES_PORT", "55432")
env.setdefault("DEBUG", "false")
report = root / "reports" / "backend"
report.mkdir(parents=True, exist_ok=True)
command = [
    sys.executable,
    "-m",
    "pytest",
    "--cov",
    "--cov-report=term-missing",
    "--cov-report=json:../reports/backend/coverage.json",
    "--cov-report=xml:../reports/backend/coverage.xml",
    "--cov-report=html",
    "--junitxml=../reports/backend/junit.xml",
    "--html=../reports/backend/tests.html",
    "--self-contained-html",
    *sys.argv[1:],
]
result = subprocess.run(command, cwd=root / "backend", env=env)
if result.returncode:
    sys.exit(result.returncode)
totals = json.loads((report / "coverage.json").read_text())["totals"]
lines = 100 * totals["covered_lines"] / totals["num_statements"]
branches = (
    100 * totals["covered_branches"] / totals["num_branches"]
    if totals["num_branches"]
    else 100
)
summary = {
    "statement_percent": round(lines, 2),
    "branch_percent": round(branches, 2),
    "statement_minimum": 90,
    "branch_minimum": 85,
    "passed": lines >= 90 and branches >= 85,
}
(report / "quality-gate.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
sys.exit(0 if summary["passed"] else 1)
