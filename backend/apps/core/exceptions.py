import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        logger.exception(f"Unhandled error: {exc}")
        response = Response({"detail": "Erreur interne."}, status=500)

    return response
