"""Run a bounded passive or authenticated active ZAP scan on the isolated stack."""

from pathlib import Path
import subprocess, sys, json

root = Path(__file__).resolve().parents[1]
mode = sys.argv[1] if len(sys.argv) > 1 else "baseline"
if mode not in ["baseline", "api"]:
    raise SystemExit("Choose baseline or api")
out = root / "reports" / "security"
out.mkdir(parents=True, exist_ok=True)
image = "ghcr.io/zaproxy/zaproxy@sha256:781a2bdaea47324e7bab583e2263f21d257b0aee61ed51521a5be45f5f5081ef"
command = [
    "docker",
    "run",
    "--rm",
    "--network",
    "expense-manager-testing",
    "-v",
    str(out) + ":/zap/wrk:rw",
]
if mode == "api":
    command += ["-v", str(root / "security") + ":/hooks:ro"]
    command += ["--env-file", str(root / ".zap.env")]
command += [image]
if mode == "baseline":
    command += [
        "zap-baseline.py",
        "-t",
        "http://frontend",
        "-m",
        "1",
        "-T",
        "3",
        "-r",
        "baseline.html",
        "-J",
        "baseline.json",
        "-w",
        "baseline.md",
    ]
else:
    command += [
        "zap-api-scan.py",
        "--hook=/hooks/scan_hooks.py",
        "-t",
        "/zap/wrk/openapi.json",
        "-f",
        "openapi",
        "-T",
        "5",
        "-r",
        "api.html",
        "-J",
        "api.json",
        "-w",
        "api.md",
        "-z",
        "-config ascan.maxScanDurationInMins=5 -config ascan.maxRuleDurationInMins=1 -config ascan.threadPerHost=2",
    ]
if mode == "api":
    (out / "api-scan-evidence.json").unlink(missing_ok=True)
with (out / (mode + ".log")).open("w") as log:
    result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
exit_code = result.returncode
if mode == "api":
    try:
        verified = json.loads((out / "api-scan-evidence.json").read_text())[
            "authenticated_scanner_identity_observed"
        ]
    except (OSError, ValueError, KeyError):
        verified = False
    if not verified:
        print("Authenticated scan evidence missing or unsuccessful; scan is invalid.")
        exit_code = 3
(out / (mode + "-exit.json")).write_text(
    json.dumps(
        {
            "exit_code": exit_code,
            "meaning": {
                0: "no configured alert failures",
                1: "configured failure alert",
                2: "warnings need triage",
                3: "scan execution error",
            }.get(exit_code, "execution error"),
        },
        indent=2,
    )
    + "\n"
)
print((out / (mode + ".log")).read_text()[-6500:])
sys.exit(exit_code)
