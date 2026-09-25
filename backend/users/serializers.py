from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "created_at"]


class RegisterSerializer(UserSerializer):
    password = serializers.CharField(
        write_only=True, max_length=128, trim_whitespace=False
    )

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["password"]

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate(self, attrs):
        try:
            validate_password(
                attrs["password"],
                User(username=attrs["username"], email=attrs["email"]),
            )
        except ValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
