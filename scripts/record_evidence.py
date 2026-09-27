"""Record source hashes and tool/environment metadata; never include secrets."""

import hashlib, json, platform, subprocess, datetime
from pathlib import Path

root = Path(__file__).resolve().parents[1]
paths = []
for folder in ["backend", "load-tests", "security", "scripts"]:
    for path in (root / folder).rglob("*"):
        if (
            path.is_file()
            and path.suffix in [".py", ".js", ".ini", ".txt", ".lock"]
            and not any(p in ["__pycache__", ".pytest_cache"] for p in path.parts)
        ):
            paths.append(path)
paths += [
    root / "backend/.coveragerc",
    root / "frontend/nginx.conf",
    root / "docker-compose.testing.yml",
]
files = {
    str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths
}
base = subprocess.check_output(
    ["git", "rev-parse", "HEAD"], cwd=root, text=True
).strip()
manifest = {
    "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "base_commit": base,
    "working_tree_sha256": files,
    "platform": platform.platform(),
    "python": platform.python_version(),
    "note": "Uncommitted testing work is identified by file hashes; base_commit alone does not identify these new tests.",
}
(root / "reports" / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
