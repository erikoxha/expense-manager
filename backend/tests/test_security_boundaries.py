from types import SimpleNamespace
import pytest
from rest_framework import serializers
from expenses.serializers import TransactionSerializer
from expenses.views import TransactionViewSet
from expenses.models import Category

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.mark.parametrize("change", ["delete", "type"])
def test_category_revalidated_after_initial_validation(
    user, category, transaction_payload, change
):
    request = SimpleNamespace(user=user)
    serializer = TransactionSerializer(
        data=transaction_payload, context={"request": request}
    )
    assert serializer.is_valid(), serializer.errors
    if change == "delete":
        category.delete()
    else:
        Category.objects.filter(pk=category.pk).update(type="INCOME")
    view = TransactionViewSet()
    view.request = request
    with pytest.raises(serializers.ValidationError):
        view.perform_create(serializer)


def test_allowed_and_untrusted_cors_origins(auth, settings):
    settings.CORS_ALLOWED_ORIGINS = ["https://trusted.example.invalid"]
    allowed = auth.get("/api/auth/me/", HTTP_ORIGIN="https://trusted.example.invalid")
    denied = auth.get("/api/auth/me/", HTTP_ORIGIN="https://untrusted.example.invalid")
    assert allowed["Access-Control-Allow-Origin"] == "https://trusted.example.invalid"
    assert "Access-Control-Allow-Origin" not in denied
    assert allowed["X-Content-Type-Options"] == "nosniff"
    assert allowed["X-Frame-Options"] == "DENY"


def test_real_password_hasher(client, settings, django_user_model):
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.PBKDF2PasswordHasher"]
    password = "Actual-PBKDF2-check-2026!"
    response = client.post(
        "/api/auth/register/",
        {"username": "realhash", "email": "hash@example.invalid", "password": password},
        format="json",
    )
    assert response.status_code == 201
    user = django_user_model.objects.get(username="realhash")
    assert user.password.startswith("pbkdf2_sha256$") and user.check_password(password)


def test_logout_invalid_or_missing_refresh(auth):
    assert auth.post("/api/auth/logout/", {}, format="json").status_code == 400
    assert (
        auth.post(
            "/api/auth/logout/", {"refresh": "invalid"}, format="json"
        ).status_code
        == 401
    )


@pytest.mark.parametrize(
    "path", ["auth/me", "statistics/summary", "transactions", "budgets"]
)
def test_private_api_responses_are_not_cacheable(auth, path):
    response = auth.get("/api/" + path + "/")
    assert response.status_code == 200
    assert "no-store" in response["Cache-Control"] and response["Pragma"] == "no-cache"


def test_middleware_preserves_non_api_response():
    from config.middleware import PrivateAPIResponseMiddleware
    from django.http import HttpResponse

    response = PrivateAPIResponseMiddleware(lambda request: HttpResponse("ok"))(
        SimpleNamespace(path="/")
    )
    assert "Cache-Control" not in response


@pytest.mark.parametrize(
    "payload", ["ZAP AND 1=1 -- ", "ZAP AND 1=2 -- ", "quote' OR '1'='1"]
)
def test_zap_category_payload_is_bound_data(auth, user, foreign_category, payload):
    from django.db import connection

    statements = []

    def record(execute, sql, params, many, context):
        statements.append((sql, params))
        return execute(sql, params, many, context)

    before = Category.objects.count()
    with connection.execute_wrapper(record):
        response = auth.post(
            "/api/categories/", {"name": payload, "type": "EXPENSE"}, format="json"
        )
    assert response.status_code == 201
    assert response.data["name"] == payload.strip()
    assert Category.objects.count() == before + 1
    assert Category.objects.get(pk=response.data["id"]).user_id == user.id
    relevant = [
        (sql, params)
        for sql, params in statements
        if params and payload.strip() in params
    ]
    assert relevant, "Payload must reach the parameterized database query"
    assert all(payload.strip() not in sql and "%s" in sql for sql, _ in relevant)
    duplicate = auth.post(
        "/api/categories/", {"name": payload, "type": "EXPENSE"}, format="json"
    )
    assert duplicate.status_code == 400
    assert Category.objects.count() == before + 1
    foreign_category.refresh_from_db()
    assert foreign_category.name == "Private"
