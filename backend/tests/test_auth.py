from datetime import timedelta
import pytest
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from conftest import PASSWORD

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


def test_register_hashes_password_and_never_returns_it(client, django_user_model):
    data = {
        "username": "new-user",
        "email": "NEW@EXAMPLE.INVALID",
        "password": PASSWORD,
    }
    response = client.post("/api/auth/register/", data, format="json")
    assert response.status_code == 201, response.data
    record = django_user_model.objects.get(username="new-user")
    assert record.email == "new@example.invalid"
    assert record.password != PASSWORD and record.check_password(PASSWORD)
    assert set(response.data) == {"id", "username", "email", "created_at"}


@pytest.mark.parametrize(
    "patch,field",
    [
        ({"password": "12345678"}, "password"),
        ({"email": "bad"}, "email"),
        ({"username": ""}, "username"),
        ({"password": "short"}, "password"),
        ({"username": "a" * 151}, "username"),
    ],
)
def test_registration_validation(client, patch, field):
    response = client.post(
        "/api/auth/register/",
        {
            "username": "new",
            "email": "new@example.invalid",
            "password": PASSWORD,
            **patch,
        },
        format="json",
    )
    assert response.status_code == 400
    assert field in response.data["fields"]


@pytest.mark.parametrize("field", ["username", "email", "password"])
def test_missing_registration_fields(client, field):
    data = {"username": "new", "email": "new@example.invalid", "password": PASSWORD}
    data.pop(field)
    assert client.post("/api/auth/register/", data, format="json").status_code == 400


@pytest.mark.parametrize(
    "patch", [{"username": "alice"}, {"email": "ALICE@example.invalid"}]
)
def test_duplicate_registration(client, user, patch):
    response = client.post(
        "/api/auth/register/",
        {
            "username": "new",
            "email": "new@example.invalid",
            "password": PASSWORD,
            **patch,
        },
        format="json",
    )
    assert response.status_code == 400


def test_login_profile_refresh_rotation_logout(client, user):
    login = client.post(
        "/api/auth/login/",
        {"username": user.username, "password": PASSWORD},
        format="json",
    )
    assert login.status_code == 200
    old = login.data["refresh"]
    rotated = client.post("/api/auth/refresh/", {"refresh": old}, format="json")
    assert rotated.status_code == 200 and rotated.data["refresh"] != old
    assert (
        client.post("/api/auth/refresh/", {"refresh": old}, format="json").status_code
        == 401
    )
    client.credentials(HTTP_AUTHORIZATION="Bearer " + rotated.data["access"])
    assert client.get("/api/auth/me/").data["id"] == user.id
    assert (
        client.post(
            "/api/auth/logout/", {"refresh": rotated.data["refresh"]}, format="json"
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/auth/refresh/", {"refresh": rotated.data["refresh"]}, format="json"
        ).status_code
        == 401
    )
    # Existing access JWTs intentionally remain valid until expiry.
    assert client.get("/api/auth/me/").status_code == 200


@pytest.mark.parametrize(
    "credentials",
    [
        {"username": "alice", "password": "wrong"},
        {"username": "missing", "password": PASSWORD},
    ],
)
def test_bad_login(client, user, credentials):
    assert (
        client.post("/api/auth/login/", credentials, format="json").status_code == 401
    )


def test_inactive_account_cannot_login(client, user):
    user.is_active = False
    user.save()
    assert (
        client.post(
            "/api/auth/login/",
            {"username": user.username, "password": PASSWORD},
            format="json",
        ).status_code
        == 401
    )


@pytest.mark.parametrize("kind", ["absent", "malformed", "expired"])
def test_invalid_access(client, user, kind):
    if kind == "malformed":
        client.credentials(HTTP_AUTHORIZATION="Bearer bad")
    if kind == "expired":
        token = AccessToken.for_user(user)
        token.set_exp(
            from_time=timezone.now() - timedelta(minutes=10),
            lifetime=timedelta(minutes=1),
        )
        client.credentials(HTTP_AUTHORIZATION="Bearer " + str(token))
    response = client.get("/api/auth/me/")
    assert response.status_code == 401 and "error" in response.data


@pytest.mark.parametrize(
    "path",
    [
        "categories",
        "transactions",
        "budgets",
        "statistics/summary",
        "statistics/expenses-by-category",
        "statistics/income-by-category",
        "statistics/monthly",
        "statistics/budgets",
    ],
)
def test_all_private_collections_require_auth(client, path):
    assert client.get("/api/" + path + "/").status_code == 401


def test_anonymous_throttle(client, settings):
    from rest_framework.throttling import AnonRateThrottle

    # Patch the existing rate map; avoids changing auth/permission behavior.
    original = AnonRateThrottle.THROTTLE_RATES.copy()
    try:
        AnonRateThrottle.THROTTLE_RATES["anon"] = "2/min"
        for _ in range(2):
            client.post("/api/auth/login/", {}, format="json")
        assert client.post("/api/auth/login/", {}, format="json").status_code == 429
    finally:
        AnonRateThrottle.THROTTLE_RATES.clear()
        AnonRateThrottle.THROTTLE_RATES.update(original)


def test_logout_requires_authenticated_access(client, user):
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user))
    response = client.post("/api/auth/logout/", {"refresh": token}, format="json")
    assert response.status_code == 401
    assert (
        client.post("/api/auth/refresh/", {"refresh": token}, format="json").status_code
        == 200
    )


def test_logout_cannot_revoke_another_account(auth, other, client):
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(other))
    response = auth.post("/api/auth/logout/", {"refresh": token}, format="json")
    assert response.status_code == 403
    assert (
        client.post("/api/auth/refresh/", {"refresh": token}, format="json").status_code
        == 200
    )
