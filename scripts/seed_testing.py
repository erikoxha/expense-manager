"""Run via manage.py shell in the isolated testing stack only."""

import os
from django.conf import settings
from django.contrib.auth import get_user_model
from expenses.models import Category, Transaction, Budget

if settings.DATABASES["default"]["NAME"] != "expense_testing":
    raise RuntimeError("Refusing to seed a non-testing database.")
password = os.environ["LOAD_PASSWORD"]
for index in range(1, int(os.getenv("LOAD_USERS", "20")) + 1):
    user, created = get_user_model().objects.get_or_create(
        username=f"load_{index}", defaults={"email": f"load_{index}@example.invalid"}
    )
    if created:
        user.set_password(password)
        user.save()
    cat, _ = Category.objects.get_or_create(
        user=user, name="Load expenses", type="EXPENSE"
    )
    income, _ = Category.objects.get_or_create(
        user=user, name="Load income", type="INCOME"
    )
    Transaction.objects.get_or_create(
        user=user,
        category=income,
        description="Load baseline",
        defaults={"type": "INCOME", "amount": "1000", "date": "2026-09-15"},
    )
    Budget.objects.get_or_create(
        user=user,
        category=cat,
        start_date="2026-09-01",
        end_date="2026-09-30",
        defaults={"amount": "100"},
    )
user, created = get_user_model().objects.get_or_create(
    username="scanner", defaults={"email": "scanner@example.invalid"}
)
if created:
    user.set_unusable_password()
    user.save()
cat, _ = Category.objects.get_or_create(user=user, name="Scan expenses", type="EXPENSE")
Transaction.objects.get_or_create(
    user=user,
    category=cat,
    description="Scanner fixture",
    defaults={"type": "EXPENSE", "amount": "5", "date": "2026-09-15"},
)
Budget.objects.get_or_create(
    user=user,
    category=cat,
    start_date="2026-09-01",
    end_date="2026-09-30",
    defaults={"amount": "100"},
)
print("Prepared isolated load and scanner fixtures; no credentials printed.")
