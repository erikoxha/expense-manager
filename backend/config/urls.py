from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)
from users.views import RegisterView, MeView
from expenses import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet)
router.register("transactions", views.TransactionViewSet)
router.register("budgets", views.BudgetViewSet)
urlpatterns = [
    path("api/", include(router.urls)),
    path("api/auth/register/", RegisterView.as_view()),
    path("api/auth/login/", TokenObtainPairView.as_view()),
    path("api/auth/refresh/", TokenRefreshView.as_view()),
    path("api/auth/logout/", TokenBlacklistView.as_view()),
    path("api/auth/me/", MeView.as_view()),
    path("api/statistics/summary/", views.summary),
    path("api/statistics/expenses-by-category/", views.expenses_by_category),
    path("api/statistics/income-by-category/", views.income_by_category),
    path("api/statistics/monthly/", views.monthly),
    path("api/statistics/budgets/", views.budgets),
]
