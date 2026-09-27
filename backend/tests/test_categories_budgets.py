from decimal import Decimal
import pytest
from expenses.models import Category, Budget

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.mark.parametrize(
    "name,kind,expected",
    [
        ("Food", "EXPENSE", 400),
        (" FOOD ", "EXPENSE", 400),
        ("Food", "INCOME", 201),
        ("", "EXPENSE", 400),
        ("   ", "EXPENSE", 400),
        ("a" * 80, "EXPENSE", 201),
        ("a" * 81, "EXPENSE", 400),
        ("Valid", "INVALID", 400),
    ],
)
def test_category_partitions(auth, category, name, kind, expected):
    assert (
        auth.post(
            "/api/categories/", {"name": name, "type": kind}, format="json"
        ).status_code
        == expected
    )


def test_category_crud_and_normalization(auth, other):
    created = auth.post(
        "/api/categories/",
        {"name": "  Travel  ", "type": "EXPENSE", "user": other.id},
        format="json",
    )
    assert created.status_code == 201 and created.data["name"] == "Travel"
    path = f"/api/categories/{created.data['id']}/"
    assert auth.get(path).status_code == 200
    assert auth.patch(path, {"type": "INCOME"}, format="json").status_code == 200
    assert (
        auth.put(
            path, {"name": "Consulting", "type": "INCOME"}, format="json"
        ).status_code
        == 200
    )
    assert auth.delete(path).status_code == 204


@pytest.mark.parametrize("method", ["get", "patch", "put", "delete"])
def test_foreign_category_hidden(auth, foreign_category, method):
    response = getattr(auth, method)(
        f"/api/categories/{foreign_category.id}/",
        {"name": "Taken", "type": "EXPENSE"},
        format="json",
    )
    assert response.status_code == 404
    foreign_category.refresh_from_db()
    assert foreign_category.name == "Private"


@pytest.mark.parametrize("reference", ["transaction", "budget"])
def test_used_category_protection(auth, category, make_transaction, budget, reference):
    if reference == "transaction":
        budget.delete()
        make_transaction()
    path = f"/api/categories/{category.id}/"
    assert auth.patch(path, {"type": "INCOME"}, format="json").status_code == 400
    assert auth.delete(path).status_code == 409
    assert auth.patch(path, {"name": "Renamed"}, format="json").status_code == 200


@pytest.mark.parametrize(
    "patch,expected",
    [
        ({"amount": "0"}, 400),
        ({"amount": "-1"}, 400),
        ({"amount": "0.001"}, 400),
        ({"amount": "0.01"}, 201),
        ({"amount": "9999999999.99"}, 201),
        ({"amount": "10000000000.00"}, 400),
        ({"start_date": "2026-10-01"}, 400),
        ({"end_date": "bad"}, 400),
        ({"end_date": "2026-09-01"}, 201),
    ],
)
def test_budget_boundaries(auth, category, patch, expected):
    body = {
        "category": category.id,
        "amount": "100.00",
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
        **patch,
    }
    assert auth.post("/api/budgets/", body, format="json").status_code == expected


@pytest.mark.parametrize("field", ["amount", "category", "start_date", "end_date"])
def test_budget_missing_fields(auth, category, field):
    body = {
        "category": category.id,
        "amount": "100.00",
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
    }
    body.pop(field)
    response = auth.post("/api/budgets/", body, format="json")
    assert response.status_code == 400 and field in response.data["fields"]


@pytest.mark.parametrize("selection", ["foreign", "income", "missing"])
def test_budget_category_references(auth, foreign_category, income_category, selection):
    cid = {
        "foreign": foreign_category.id,
        "income": income_category.id,
        "missing": 999999,
    }[selection]
    assert (
        auth.post(
            "/api/budgets/",
            {
                "category": cid,
                "amount": "100",
                "start_date": "2026-09-01",
                "end_date": "2026-09-30",
            },
            format="json",
        ).status_code
        == 400
    )


def test_budget_crud_and_partial_date_validation(auth, budget, make_transaction, other):
    path = f"/api/budgets/{budget.id}/"
    make_transaction(amount=Decimal("100"))
    assert auth.get(path).data["progress"]["status"] == "REACHED"
    assert (
        auth.patch(path, {"amount": "99.99", "user": other.id}, format="json").data[
            "progress"
        ]["status"]
        == "OVER_BUDGET"
    )
    assert (
        auth.patch(path, {"start_date": "2026-10-01"}, format="json").status_code == 400
    )
    response = auth.put(
        path,
        {
            "category": budget.category_id,
            "amount": "101",
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
        },
        format="json",
    )
    assert (
        response.status_code == 200
        and response.data["progress"]["status"] == "WITHIN_BUDGET"
    )
    budget.refresh_from_db()
    assert budget.user_id != other.id
    assert auth.delete(path).status_code == 204


@pytest.mark.parametrize("method", ["get", "patch", "put", "delete"])
def test_foreign_budget_hidden(auth, other, foreign_category, method):
    record = Budget.objects.create(
        user=other,
        category=foreign_category,
        amount="100",
        start_date="2026-09-01",
        end_date="2026-09-30",
    )
    assert (
        getattr(auth, method)(
            f"/api/budgets/{record.id}/", {"amount": "1"}, format="json"
        ).status_code
        == 404
    )
    record.refresh_from_db()
    assert record.amount == Decimal("100")


def test_overlapping_budgets_independently_count(auth, budget, make_transaction):
    make_transaction(amount=Decimal("20"))
    other = Budget.objects.create(
        user=budget.user,
        category=budget.category,
        amount="50",
        start_date=budget.start_date,
        end_date=budget.end_date,
    )
    data = auth.get("/api/statistics/budgets/").data
    assert len(data) == 2 and {b["progress"]["spent"] for b in data} == {"20.00"}
