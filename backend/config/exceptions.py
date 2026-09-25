import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from django.db.models import ProtectedError
from django.db import IntegrityError


def handler(exc, context):
    if isinstance(exc, ProtectedError):
        return Response(
            {
                "error": "This category is used by transactions or budgets. Remove those records first."
            },
            status=409,
        )
    if isinstance(exc, IntegrityError):
        return Response(
            {"error": "This change conflicts with an existing record or constraint."},
            status=409,
        )
    response = exception_handler(exc, context)
    if response is not None:
        data = response.data
        response.data = {
            "error": (
                str(data.get("detail", "Please check the submitted fields."))
                if isinstance(data, dict)
                else "Request failed."
            ),
            "fields": data,
        }
    if response is None:
        logging.getLogger(__name__).error("Unhandled API exception", exc_info=True)
        return Response({"error": "An unexpected server error occurred."}, status=500)
    return response
