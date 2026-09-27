import os
import secrets
from datetime import date
from decimal import Decimal
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient
from expenses.models import Category, Transaction, Budget

PASSWORD = "Test-Only-Password-2026!"


@pytest.fixture(autouse=True)
def deterministic_test_settings(settings):
    # Keep password validation active; speed up hashing only in this isolated test process.
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    settings.ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
    settings.SECURE_SSL_REDIRECT = False
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db, django_user_model):
    return django_user_model.objects.create_user(
        username="alice", email="alice@example.invalid", password=PASSWORD
    )


@pytest.fixture
def other(db, django_user_model):
    return django_user_model.objects.create_user(
        username="bob", email="bob@example.invalid", password=PASSWORD
    )


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def auth(client, user):
    response = client.post(
        "/api/auth/login/",
        {"username": user.username, "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 200
    client.credentials(HTTP_AUTHORIZATION="Bearer " + response.data["access"])
    return client


@pytest.fixture
def category(user):
    return Category.objects.create(user=user, name="Food", type="EXPENSE")


@pytest.fixture
def income_category(user):
    return Category.objects.create(user=user, name="Salary", type="INCOME")


@pytest.fixture
def foreign_category(other):
    return Category.objects.create(user=other, name="Private", type="EXPENSE")


@pytest.fixture
def make_transaction(user, category):
    def create(**kwargs):
        selected = kwargs.pop("category", category)
        return Transaction.objects.create(
            user=kwargs.pop("user", user),
            category=selected,
            type=kwargs.pop("type", selected.type),
            amount=kwargs.pop("amount", Decimal("10.00")),
            date=kwargs.pop("date", date(2026, 9, 15)),
            description=kwargs.pop("description", "Groceries"),
            **kwargs
        )

    return create


@pytest.fixture
def budget(user, category):
    return Budget.objects.create(
        user=user,
        category=category,
        amount=Decimal("100.00"),
        start_date=date(2026, 9, 1),
        end_date=date(2026, 9, 30),
    )


@pytest.fixture
def transaction_payload(category):
    return {
        "category": category.id,
        "type": "EXPENSE",
        "amount": "12.34",
        "date": "2026-09-15",
        "description": "Food shop",
    }
