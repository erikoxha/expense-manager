from datetime import date
from decimal import Decimal
import pytest
from expenses import services

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


def test_empty_summary(user):
    assert services.summary(user) == {
        "income": "0.00",
        "expenses": "0.00",
        "balance": "0.00",
        "transaction_count": 0,
    }
    assert services.monthly(user) == []
    assert services.category_breakdown(user, "EXPENSE") == []


def test_exact_decimal_balance_and_isolation(
    user, other, income_category, foreign_category, make_transaction
):
    make_transaction(category=income_category, amount=Decimal("0.30"))
    make_transaction(amount=Decimal("0.10"))
    make_transaction(amount=Decimal("0.20"))
    make_transaction(user=other, category=foreign_category, amount=Decimal("999.00"))
    assert services.summary(user) == {
        "income": "0.30",
        "expenses": "0.30",
        "balance": "0.00",
        "transaction_count": 3,
    }


def test_negative_balance(user, make_transaction):
    make_transaction(amount=Decimal("0.01"))
    assert services.summary(user)["balance"] == "-0.01"


@pytest.mark.parametrize(
    "spent,status,remaining,percent",
    [
        ("0.00", "WITHIN_BUDGET", "100.00", "0.00"),
        ("99.99", "WITHIN_BUDGET", "0.01", "99.99"),
        ("100.00", "REACHED", "0.00", "100.00"),
        ("100.01", "OVER_BUDGET", "-0.01", "100.01"),
    ],
)
def test_budget_decision_boundaries(
    budget, make_transaction, spent, status, remaining, percent
):
    if Decimal(spent) > 0:
        make_transaction(amount=Decimal(spent))
    assert services.budget_progress(budget) == {
        "spent": spent,
        "remaining": remaining,
        "percentage": percent,
        "status": status,
    }


def test_budget_inclusive_dates_and_owner_category_scope(
    budget, other, foreign_category, income_category, make_transaction
):
    for day, amount in [
        ("2026-08-31", "500"),
        ("2026-09-01", "10"),
        ("2026-09-30", "20"),
        ("2026-10-01", "500"),
    ]:
        make_transaction(date=date.fromisoformat(day), amount=Decimal(amount))
    make_transaction(user=other, category=foreign_category, amount=Decimal("500"))
    make_transaction(category=income_category, amount=Decimal("500"))
    assert services.budget_progress(budget)["spent"] == "30.00"


def test_aggregations_monthly_and_categories(user, income_category, make_transaction):
    make_transaction(date=date(2026, 8, 31), amount=Decimal("2.50"))
    make_transaction(date=date(2026, 9, 1), amount=Decimal("3.50"))
    make_transaction(
        category=income_category, date=date(2026, 9, 2), amount=Decimal("10")
    )
    assert services.monthly(user) == [
        {"month": "2026-08", "income": "0.00", "expenses": "2.50"},
        {"month": "2026-09", "income": "10.00", "expenses": "3.50"},
    ]
    assert services.category_breakdown(user, "EXPENSE")[0]["amount"] == "6.00"
    assert services.category_breakdown(user, "INCOME")[0]["amount"] == "10.00"
