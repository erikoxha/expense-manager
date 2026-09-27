"""Generate isolated local testing credentials without printing them."""

from pathlib import Path
import secrets

root = Path(__file__).resolve().parents[1]
path = root / ".testing.env"
if path.exists():
    print(".testing.env already exists; preserved.")
else:
    path.write_text(
        "\n".join(
            [
                "POSTGRES_DB=expense_testing",
                "POSTGRES_USER=expense_testing",
                "POSTGRES_PASSWORD=" + secrets.token_urlsafe(24),
                "DJANGO_SECRET_KEY=" + secrets.token_urlsafe(50),
                "LOAD_PASSWORD=" + secrets.token_urlsafe(24),
                "LOAD_USERS=20",
                "DEMO_PASSWORD=" + secrets.token_urlsafe(24),
            ]
        )
        + "\n"
    )
    path.chmod(0o600)
    print("Created ignored .testing.env for the isolated test stack.")
for folder in ["backend", "load", "security"]:
    (root / "reports" / folder).mkdir(parents=True, exist_ok=True)
