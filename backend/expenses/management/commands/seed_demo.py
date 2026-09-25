import os
from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction
from expenses.models import Category, Transaction, Budget


class Command(BaseCommand):
    help = "Create two isolated demo accounts. Requires DEMO_PASSWORD. Does not overwrite existing accounts."

    @transaction.atomic
    def handle(self, *args, **kwargs):
        password = os.getenv("DEMO_PASSWORD")
        if not password:
            raise CommandError("Set DEMO_PASSWORD before seeding.")
        today = date.today()
        start = today.replace(day=1)
        end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(
            days=1
        )
        for username in ["demo", "demo_other"]:
            if get_user_model().objects.filter(username=username).exists():
                self.stdout.write(f"{username} already exists; skipped.")
                continue
            user = get_user_model().objects.create_user(
                username=username,
                email=f"{username}@example.invalid",
                password=password,
            )
            cats = {
                name: Category.objects.create(user=user, name=name, type=kind)
                for name, kind in [
                    ("Salary", "INCOME"),
                    ("Freelance", "INCOME"),
                    ("Groceries", "EXPENSE"),
                    ("Transport", "EXPENSE"),
                    ("Dining", "EXPENSE"),
                    ("Shopping", "EXPENSE"),
                    ("Housing", "EXPENSE"),
                ]
            }
            for offset in range(4):
                day = start - timedelta(days=1) if offset else today
                if offset > 1:
                    day = (start - timedelta(days=30 * offset)).replace(day=15)
                entries = [
                    ("Salary", "3200.00", "Monthly salary"),
                    ("Freelance", "450.00", "Design project"),
                    ("Groceries", "180.00", "Weekly groceries"),
                    ("Transport", "100.00", "Monthly transit pass"),
                    ("Dining", "140.00", "Dinner with friends"),
                    ("Shopping", "85.00", "Home essentials"),
                    ("Housing", "950.00", "Monthly rent"),
                ]
                for name, amount, description in entries:
                    Transaction.objects.create(
                        user=user,
                        category=cats[name],
                        type=cats[name].type,
                        amount=Decimal(amount),
                        description=description,
                        date=day,
                    )
            for name, amount in [
                ("Groceries", "400.00"),
                ("Transport", "100.00"),
                ("Dining", "120.00"),
            ]:
                Budget.objects.create(
                    user=user,
                    category=cats[name],
                    amount=Decimal(amount),
                    start_date=start,
                    end_date=end,
                )
            self.stdout.write(self.style.SUCCESS(f"Created {username}"))
