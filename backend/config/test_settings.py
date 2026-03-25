from .settings import *

# Override REST_FRAMEWORK settings for tests
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.core.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [],  # Disable throttling in tests
    "DEFAULT_THROTTLE_RATES": {
        "anon": "999/minute",
        "user": "999/minute",
        "login": "999/minute",  # For LoginRateThrottle
    },
}

# Disable secure cookies in tests (HTTP, not HTTPS)
AUTH_COOKIE_SECURE = False
