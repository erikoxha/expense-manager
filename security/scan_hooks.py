"""Record only aggregate scan evidence, never HTTP bodies or auth headers."""

import json
from collections import Counter
from pathlib import Path


def zap_started(zap, target):
    zap.urlopen("http://frontend/api/auth/me/")


def zap_pre_shutdown(zap):
    statuses = Counter()
    authenticated_me = False
    count = int(zap.core.number_of_messages(baseurl="http://frontend"))
    for offset in range(0, count, 500):
        for message in zap.core.messages(
            baseurl="http://frontend", start=offset, count=500
        ):
            request_line = message.get("requestHeader", "").splitlines()[0]
            response_line = message.get("responseHeader", "").splitlines()[0]
            code = (
                response_line.split()[1]
                if len(response_line.split()) > 1
                else "unknown"
            )
            statuses[code] += 1
            if "/api/auth/me/" in request_line and code == "200":
                try:
                    authenticated_me |= (
                        json.loads(message.get("responseBody", "{}")).get("username")
                        == "scanner"
                    )
                except ValueError:
                    pass
    evidence = {
        "messages": count,
        "response_status_counts": dict(statuses),
        "authenticated_scanner_identity_observed": authenticated_me,
        "active_scans": zap.ascan.scans,
        "note": "Successful identity response observed inside ZAP; this is not exhaustive authenticated coverage.",
    }
    Path("/zap/wrk/api-scan-evidence.json").write_text(
        json.dumps(evidence, indent=2) + "\n"
    )
    if not authenticated_me:
        raise RuntimeError("ZAP did not observe a successful scanner identity response")
