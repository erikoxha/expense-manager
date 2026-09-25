from rest_framework import serializers
from .models import Category, Transaction, Budget
from .services import budget_progress


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "type", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        name = attrs.get("name", getattr(self.instance, "name", "")).strip()
        kind = attrs.get("type", getattr(self.instance, "type", None))
        existing = Category.objects.filter(
            user=self.context["request"].user, name__iexact=name, type=kind
        )
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
            if kind != self.instance.type and (
                self.instance.transactions.exists() or self.instance.budgets.exists()
            ):
                raise serializers.ValidationError(
                    {"type": "Cannot change the type of a category that is in use."}
                )
        if existing.exists():
            raise serializers.ValidationError(
                {"name": "A category with this name and type already exists."}
            )
        attrs["name"] = name
        return attrs


class OwnedCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        self.fields["category"].queryset = (
            Category.objects.filter(user=request.user)
            if request
            else Category.objects.none()
        )


class TransactionSerializer(OwnedCategorySerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "category",
            "category_name",
            "type",
            "amount",
            "description",
            "date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))
        kind = attrs.get("type", getattr(self.instance, "type", None))
        if category and category.type != kind:
            raise serializers.ValidationError(
                {"category": "Category type must match the transaction type."}
            )
        return attrs


class BudgetSerializer(OwnedCategorySerializer):
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id",
            "category",
            "category_name",
            "amount",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
            "progress",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "progress"]

    def get_progress(self, obj):
        return budget_progress(obj)

    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if category and category.type != "EXPENSE":
            raise serializers.ValidationError(
                {"category": "Budgets require an expense category."}
            )
        if start and end and start > end:
            raise serializers.ValidationError(
                {"end_date": "End date must be on or after start date."}
            )
        return attrs


class TransactionFilters(serializers.Serializer):
    type = serializers.ChoiceField(choices=["INCOME", "EXPENSE"], required=False)
    category = serializers.CharField(required=False, max_length=80)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    min_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False
    )
    max_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False
    )
    search = serializers.CharField(required=False, max_length=500)

    def validate(self, attrs):
        for low, high in [("start_date", "end_date"), ("min_amount", "max_amount")]:
            if low in attrs and high in attrs and attrs[low] > attrs[high]:
                raise serializers.ValidationError(
                    {high: "Maximum must be at least the minimum."}
                )
        return attrs
