from decimal import Decimal
from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.core.validators import MinValueValidator


class Kind(models.TextChoices):
    INCOME = "INCOME", "Income"
    EXPENSE = "EXPENSE", "Expense"


class Category(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=7, choices=Kind.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"), "user", "type", name="unique_category_per_user_type"
            ),
            models.CheckConstraint(
                condition=models.Q(type__in=["INCOME", "EXPENSE"]),
                name="category_valid_type",
            ),
        ]


class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="transactions"
    )
    type = models.CharField(max_length=7, choices=Kind.choices)
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    description = models.CharField(max_length=500, blank=True)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "category", "date"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0), name="transaction_positive_amount"
            ),
            models.CheckConstraint(
                condition=models.Q(type__in=["INCOME", "EXPENSE"]),
                name="transaction_valid_type",
            ),
        ]


class Budget(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="budgets"
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-id"]
        indexes = [models.Index(fields=["user", "start_date", "end_date"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0), name="budget_positive_amount"
            ),
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="budget_ordered_dates",
            ),
        ]
