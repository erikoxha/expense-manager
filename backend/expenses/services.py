from decimal import Decimal
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from .models import Transaction

ZERO = Decimal("0.00")


def total(queryset):
    return queryset.aggregate(value=Sum("amount"))["value"] or ZERO


def summary(user):
    records = Transaction.objects.filter(user=user)
    income = total(records.filter(type="INCOME"))
    expenses = total(records.filter(type="EXPENSE"))
    return {
        "income": str(income),
        "expenses": str(expenses),
        "balance": str(income - expenses),
        "transaction_count": records.count(),
    }


def budget_progress(budget):
    spent = total(
        Transaction.objects.filter(
            user=budget.user,
            category=budget.category,
            type="EXPENSE",
            date__range=(budget.start_date, budget.end_date),
        )
    )
    remaining = budget.amount - spent
    percentage = spent / budget.amount * 100 if budget.amount else ZERO
    return {
        "spent": str(spent),
        "remaining": str(remaining),
        "percentage": str(percentage.quantize(Decimal("0.01"))),
        "status": (
            "OVER_BUDGET"
            if remaining < 0
            else "REACHED" if remaining == 0 else "WITHIN_BUDGET"
        ),
    }


def category_breakdown(user, kind):
    rows = (
        Transaction.objects.filter(user=user, type=kind)
        .order_by()
        .values("category_id", "category__name")
        .annotate(amount=Sum("amount"))
        .order_by("-amount")
    )
    return [
        {
            "category": r["category_id"],
            "name": r["category__name"],
            "amount": str(r["amount"]),
        }
        for r in rows
    ]


def monthly(user):
    rows = (
        Transaction.objects.filter(user=user)
        .order_by()
        .annotate(month=TruncMonth("date"))
        .values("month", "type")
        .annotate(amount=Sum("amount"))
        .order_by("month")
    )
    result = {}
    for row in rows:
        key = row["month"].strftime("%Y-%m")
        result.setdefault(key, {"month": key, "income": "0.00", "expenses": "0.00"})
        result[key]["income" if row["type"] == "INCOME" else "expenses"] = str(
            row["amount"]
        )
    return list(result.values())
