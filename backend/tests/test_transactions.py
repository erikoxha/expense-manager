from decimal import Decimal
import pytest
from expenses.models import Transaction

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.mark.parametrize(
    "amount,expected",
    [
        ("0.01", 201),
        ("12.34", 201),
        ("9999999999.99", 201),
        ("0", 400),
        ("-0.01", 400),
        ("0.001", 400),
        ("10000000000", 400),
        ("abc", 400),
        ("NaN", 400),
        ("Infinity", 400),
        ("", 400),
        (None, 400),
    ],
)
def test_amount_partitions(auth, transaction_payload, amount, expected):
    response = auth.post(
        "/api/transactions/", {**transaction_payload, "amount": amount}, format="json"
    )
    assert response.status_code == expected, response.data
    if expected == 201:
        assert Decimal(response.data["amount"]) == Decimal(amount)
    else:
        assert "amount" in response.data["fields"] and not Transaction.objects.exists()


@pytest.mark.parametrize("field", ["amount", "date", "category", "type"])
def test_missing_fields(auth, transaction_payload, field):
    transaction_payload.pop(field)
    response = auth.post("/api/transactions/", transaction_payload, format="json")
    assert response.status_code == 400 and field in response.data["fields"]


@pytest.mark.parametrize("value", ["2026-02-30", "25/09/2026", "invalid", "", None])
def test_invalid_dates(auth, transaction_payload, value):
    response = auth.post(
        "/api/transactions/", {**transaction_payload, "date": value}, format="json"
    )
    assert response.status_code == 400 and "date" in response.data["fields"]


@pytest.mark.parametrize("length,expected", [(0, 201), (500, 201), (501, 400)])
def test_description_boundaries(auth, transaction_payload, length, expected):
    assert (
        auth.post(
            "/api/transactions/",
            {**transaction_payload, "description": "x" * length},
            format="json",
        ).status_code
        == expected
    )


@pytest.mark.parametrize("selection", ["foreign", "nonexistent", "wrong-type"])
def test_category_references(
    auth, transaction_payload, foreign_category, income_category, selection
):
    ids = {
        "foreign": foreign_category.id,
        "nonexistent": 999999,
        "wrong-type": income_category.id,
    }
    response = auth.post(
        "/api/transactions/",
        {**transaction_payload, "category": ids[selection]},
        format="json",
    )
    assert response.status_code == 400 and not Transaction.objects.exists()


def test_full_crud_and_server_owned_fields(auth, user, other, transaction_payload):
    response = auth.post(
        "/api/transactions/",
        {**transaction_payload, "user": other.id, "id": 888},
        format="json",
    )
    assert response.status_code == 201
    pk = response.data["id"]
    path = f"/api/transactions/{pk}/"
    assert Transaction.objects.get(pk=pk).user_id == user.id
    assert auth.get(path).data["description"] == "Food shop"
    assert (
        auth.patch(
            path, {"amount": "20.00", "user": other.id}, format="json"
        ).status_code
        == 200
    )
    response = auth.put(path, {**transaction_payload, "amount": "30.00"}, format="json")
    assert response.status_code == 200 and response.data["amount"] == "30.00"
    assert Transaction.objects.get(pk=pk).user_id == user.id
    assert auth.delete(path).status_code == 204
    assert auth.get(path).status_code == 404


def test_patch_category_type_consistency(auth, make_transaction, income_category):
    record = make_transaction()
    path = f"/api/transactions/{record.id}/"
    assert auth.patch(path, {"type": "INCOME"}, format="json").status_code == 400
    assert (
        auth.patch(path, {"category": income_category.id}, format="json").status_code
        == 400
    )
    assert (
        auth.patch(
            path, {"category": income_category.id, "type": "INCOME"}, format="json"
        ).status_code
        == 200
    )


@pytest.mark.parametrize("method", ["get", "patch", "put", "delete"])
def test_other_users_transaction_hidden(
    auth, other, foreign_category, make_transaction, transaction_payload, method
):
    record = make_transaction(user=other, category=foreign_category)
    response = getattr(auth, method)(
        f"/api/transactions/{record.id}/", transaction_payload, format="json"
    )
    assert response.status_code == 404
    record.refresh_from_db()
    assert record.amount == Decimal("10.00")


def test_pagination_ordering(auth, make_transaction):
    rows = [make_transaction() for _ in range(26)]
    first = auth.get("/api/transactions/").data
    assert first["count"] == 26 and len(first["results"]) == 25 and first["next"]
    assert first["results"][0]["id"] == rows[-1].id
    second = auth.get("/api/transactions/?page=2").data
    assert [r["id"] for r in second["results"]] == [rows[0].id]
    assert auth.get("/api/transactions/?page=99").status_code == 404
