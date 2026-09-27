from decimal import Decimal
import pytest
from hypothesis import given, settings, strategies as st
from expenses.services import calculate_budget_progress

pytestmark = [pytest.mark.unit, pytest.mark.property]
money = st.integers(min_value=1, max_value=999999999999).map(
    lambda cents: Decimal(cents) / 100
)
spending = st.integers(min_value=0, max_value=1999999999998).map(
    lambda cents: Decimal(cents) / 100
)


@given(amount=money, spent=spending)
@settings(max_examples=200, derandomize=True)
def test_budget_conservation_and_status(amount, spent):
    result = calculate_budget_progress(amount, spent)
    assert Decimal(result["remaining"]) + spent == amount
    assert Decimal(result["spent"]) == spent
    expected = (
        "OVER_BUDGET"
        if spent > amount
        else "REACHED" if spent == amount else "WITHIN_BUDGET"
    )
    assert result["status"] == expected
    assert Decimal(result["percentage"]) >= 0


@given(amount=money, spent=spending, extra=money)
@settings(max_examples=200, derandomize=True)
def test_adding_expense_never_increases_remaining(amount, spent, extra):
    before = calculate_budget_progress(amount, spent)
    after = calculate_budget_progress(amount, spent + extra)
    assert Decimal(after["remaining"]) == Decimal(before["remaining"]) - extra
    assert Decimal(after["percentage"]) >= Decimal(before["percentage"])


@pytest.mark.parametrize(
    "amount,spent,status,percentage",
    [
        ("100", "99.99", "WITHIN_BUDGET", "99.99"),
        ("100", "100", "REACHED", "100.00"),
        ("100", "100.01", "OVER_BUDGET", "100.01"),
        ("3", "1", "WITHIN_BUDGET", "33.33"),
        ("0", "0", "REACHED", "0.00"),
    ],
)
def test_budget_decisions_and_safe_zero(amount, spent, status, percentage):
    result = calculate_budget_progress(Decimal(amount), Decimal(spent))
    assert result["status"] == status and result["percentage"] == percentage
