from datetime import date
from decimal import Decimal
import pytest
from expenses.models import Budget

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.mark.parametrize(
    "params,expected",
    [
        ({"type": "INCOME"}, 1),
        ({"category": "Food"}, 2),
        ({"search": "SHOP"}, 1),
        ({"min_amount": "20"}, 2),
        ({"max_amount": "20"}, 2),
        ({"start_date": "2026-09-15"}, 2),
        ({"end_date": "2026-09-15"}, 2),
        ({"category": "unknown"}, 0),
        ({"search": "' OR 1=1 --"}, 0),
        (
            {
                "type": "EXPENSE",
                "category": "food",
                "start_date": "2026-09-15",
                "end_date": "2026-09-15",
                "min_amount": "20",
                "max_amount": "20",
                "search": "shop",
            },
            1,
        ),
    ],
)
def test_filter_partitions_and_combinations(
    auth, make_transaction, income_category, params, expected
):
    make_transaction(amount=Decimal("10"), date=date(2026, 9, 1), description="Market")
    make_transaction(
        amount=Decimal("20"), date=date(2026, 9, 15), description="Food SHOP"
    )
    make_transaction(
        category=income_category,
        amount=Decimal("30"),
        date=date(2026, 9, 30),
        description="Salary",
    )
    result = auth.get("/api/transactions/", params)
    assert result.status_code == 200 and result.data["count"] == expected


@pytest.mark.parametrize(
    "params",
    [
        {"type": "OTHER"},
        {"start_date": "bad"},
        {"end_date": "2026-02-30"},
        {"start_date": "2026-10-01", "end_date": "2026-09-01"},
        {"min_amount": "2", "max_amount": "1"},
        {"min_amount": "-1"},
        {"max_amount": "abc"},
        {"min_amount": "0.001"},
    ],
)
def test_invalid_filters(auth, params):
    assert auth.get("/api/transactions/", params).status_code == 400


def test_numeric_category_filter(auth, category, make_transaction):
    row = make_transaction()
    assert (
        auth.get("/api/transactions/", {"category": category.id}).data["results"][0][
            "id"
        ]
        == row.id
    )


def test_private_lists_and_statistics_isolated(
    auth, user, other, foreign_category, make_transaction, income_category, budget
):
    make_transaction(amount=Decimal("10"))
    make_transaction(category=income_category, amount=Decimal("25"))
    make_transaction(user=other, category=foreign_category, amount=Decimal("999"))
    Budget.objects.create(
        user=other,
        category=foreign_category,
        amount="1",
        start_date="2026-09-01",
        end_date="2026-09-30",
    )
    assert auth.get("/api/transactions/").data["count"] == 2
    assert foreign_category.id not in [
        r["id"] for r in auth.get("/api/categories/").data["results"]
    ]
    assert auth.get("/api/budgets/").data["count"] == 1
    assert auth.get("/api/statistics/summary/", {"user": other.id}).data == {
        "income": "25.00",
        "expenses": "10.00",
        "balance": "15.00",
        "transaction_count": 2,
    }
    assert (
        auth.get("/api/statistics/expenses-by-category/").data[0]["amount"] == "10.00"
    )
    assert auth.get("/api/statistics/income-by-category/").data[0]["amount"] == "25.00"
    assert auth.get("/api/statistics/monthly/").data == [
        {"month": "2026-09", "income": "25.00", "expenses": "10.00"}
    ]
    assert len(auth.get("/api/statistics/budgets/").data) == 1


def test_injection_like_description_is_literal(auth, transaction_payload):
    payload = "<script>alert('xss')</script>'; DROP TABLE expenses_transaction; --"
    response = auth.post(
        "/api/transactions/",
        {**transaction_payload, "description": payload},
        format="json",
    )
    assert response.status_code == 201 and response.data["description"] == payload
    assert auth.get("/api/transactions/", {"search": "DROP TABLE"}).data["count"] == 1
