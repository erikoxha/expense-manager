"""Execute only against the dedicated testing network."""

from pathlib import Path
import subprocess, sys

root = Path(__file__).resolve().parents[1]
profile = sys.argv[1] if len(sys.argv) > 1 else "smoke"
if profile not in ["smoke", "load"]:
    raise SystemExit("Choose smoke or load")
out = root / "reports" / "load"
out.mkdir(parents=True, exist_ok=True)
image = (
    "grafana/k6@sha256:e66db15b860113878fa74670e31f5e274830b7b6e42c8bff28b2f2d86a257603"
)
command = [
    "docker",
    "run",
    "--rm",
    "--network",
    "expense-manager-testing",
    "--env-file",
    str(root / ".testing.env"),
    "-e",
    "BASE_URL=http://frontend",
    "-e",
    "PROFILE=" + profile,
    "-v",
    str(root / "load-tests") + ":/scripts:ro",
    "-v",
    str(out) + ":/reports",
    image,
    "run",
    "/scripts/expense-flow.js",
]
with (out / (profile + ".log")).open("w") as log:
    result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
print((out / (profile + ".log")).read_text()[-5000:])
sys.exit(result.returncode)
