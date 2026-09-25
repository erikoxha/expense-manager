from django.db import transaction
from rest_framework import viewsets, serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Category, Transaction, Budget
from .serializers import (
    CategorySerializer,
    TransactionSerializer,
    BudgetSerializer,
    TransactionFilters,
)
from . import services


class OwnedViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = self.queryset.filter(user=self.request.user)
        if self.action in ["update", "partial_update", "destroy"]:
            queryset = queryset.select_for_update(of=("self",))
        return queryset

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def lock_category(self, serializer):
        category = serializer.validated_data.get(
            "category", getattr(serializer.instance, "category", None)
        )
        if category is None:
            return
        # Serialize category type changes with creation/reassignment of its records.
        try:
            category = Category.objects.select_for_update().get(
                pk=category.pk, user=self.request.user
            )
        except Category.DoesNotExist:
            raise serializers.ValidationError(
                {"category": "This category no longer exists."}
            )
        kind = serializer.validated_data.get(
            "type", getattr(serializer.instance, "type", "EXPENSE")
        )
        if category.type != kind:
            raise serializers.ValidationError(
                {"category": "Category type must match this record."}
            )
        serializer.validated_data["category"] = category

    def perform_create(self, serializer):
        with transaction.atomic():
            self.lock_category(serializer)
            serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        self.lock_category(serializer)
        serializer.save()


class CategoryViewSet(OwnedViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class TransactionViewSet(OwnedViewSet):
    queryset = Transaction.objects.select_related("category")
    serializer_class = TransactionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != "list":
            return queryset
        filters = TransactionFilters(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        data = filters.validated_data
        mapping = {
            "type": "type",
            "start_date": "date__gte",
            "end_date": "date__lte",
            "min_amount": "amount__gte",
            "max_amount": "amount__lte",
            "search": "description__icontains",
        }
        for param, lookup in mapping.items():
            if param in data:
                queryset = queryset.filter(**{lookup: data[param]})
        if "category" in data:
            value = data["category"]
            queryset = queryset.filter(
                **{
                    (
                        "category_id" if value.isdecimal() else "category__name__iexact"
                    ): value
                }
            )
        return queryset


class BudgetViewSet(OwnedViewSet):
    queryset = Budget.objects.select_related("category", "user")
    serializer_class = BudgetSerializer


@api_view(["GET"])
def summary(request):
    return Response(services.summary(request.user))


@api_view(["GET"])
def expenses_by_category(request):
    return Response(services.category_breakdown(request.user, "EXPENSE"))


@api_view(["GET"])
def income_by_category(request):
    return Response(services.category_breakdown(request.user, "INCOME"))


@api_view(["GET"])
def monthly(request):
    return Response(services.monthly(request.user))


@api_view(["GET"])
def budgets(request):
    records = Budget.objects.filter(user=request.user).select_related(
        "category", "user"
    )
    return Response(
        BudgetSerializer(records, many=True, context={"request": request}).data
    )
