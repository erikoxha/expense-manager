from io import StringIO
from unittest.mock import patch
import pytest
from django.db import IntegrityError, transaction
from django.core.management import call_command, CommandError
from expenses.models import Category, Transaction, Budget
from expenses.serializers import TransactionSerializer
from config.exceptions import handler
from rest_framework.exceptions import ValidationError

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.mark.parametrize(
    "model,fields",
    [
        (Transaction, {"amount": "0", "type": "EXPENSE", "date": "2026-09-15"}),
        (Transaction, {"amount": "1", "type": "INVALID", "date": "2026-09-15"}),
        (Budget, {"amount": "0", "start_date": "2026-09-01", "end_date": "2026-09-30"}),
        (Budget, {"amount": "1", "start_date": "2026-10-01", "end_date": "2026-09-30"}),
    ],
)
def test_postgres_constraints(user, category, model, fields):
    with pytest.raises(IntegrityError), transaction.atomic():
        model.objects.create(user=user, category=category, **fields)


def test_category_database_uniqueness_and_type(user, category):
    for name, kind in [("FOOD", "EXPENSE"), ("Bad", "OTHER")]:
        with pytest.raises(IntegrityError), transaction.atomic():
            Category.objects.create(user=user, name=name, type=kind)


def test_foreign_key_enforced(user):
    with pytest.raises(IntegrityError), transaction.atomic():
        Transaction.objects.create(
            user=user, category_id=999999, type="EXPENSE", amount="1", date="2026-09-01"
        )
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")


def test_unexpected_error_is_generic_json(auth):
    with patch(
        "expenses.views.services.summary", side_effect=RuntimeError("sensitive-detail")
    ):
        response = auth.get("/api/statistics/summary/")
    assert response.status_code == 500 and "sensitive-detail" not in str(response.data)


def test_conflict_and_non_field_error_formats():
    assert handler(IntegrityError("secret"), {}).status_code == 409
    assert (
        handler(ValidationError(["invalid request"]), {}).data["error"]
        == "Request failed."
    )


def test_serializer_without_request_has_no_category_access():
    assert not TransactionSerializer().fields["category"].queryset.exists()


def test_seed_requires_password(monkeypatch):
    monkeypatch.delenv("DEMO_PASSWORD", raising=False)
    with pytest.raises(CommandError):
        call_command("seed_demo")


def test_seed_is_idempotent_and_has_all_budget_states(monkeypatch, django_user_model):
    monkeypatch.setenv("DEMO_PASSWORD", "Seed-only-pass-2026!")
    output = StringIO()
    call_command("seed_demo", stdout=output)
    assert django_user_model.objects.count() == 2
    assert Transaction.objects.count() == 56 and Budget.objects.count() == 6
    from expenses.services import budget_progress

    assert {budget_progress(b)["status"] for b in Budget.objects.all()} == {
        "WITHIN_BUDGET",
        "REACHED",
        "OVER_BUDGET",
    }
    call_command("seed_demo", stdout=output)
    assert Transaction.objects.count() == 56 and "skipped" in output.getvalue()
