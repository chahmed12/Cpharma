import os
from datetime import timedelta
from pathlib  import Path

# Charger les variables d'environnement (si présentes)
# Pour le dev, on garde des fallbacks sécurisés
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-prod-key-must-be-changed')
DEBUG      = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*']

AUTH_USER_MODEL = 'accounts.CustomUser'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    # Local apps
    'apps.accounts',
    'apps.patients',
    'apps.consultations',
    'apps.prescriptions',
    'apps.payments',

]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF     = 'config.urls'
ASGI_APPLICATION = 'config.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     os.environ.get('POSTGRES_DB',       'pharma_db'),
        'USER':     os.environ.get('POSTGRES_USER',     'pharma_user'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'zenvour'),
        'HOST':     os.environ.get('POSTGRES_HOST',     'localhost'),
        'PORT':     os.environ.get('POSTGRES_PORT',     '5432'),
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG':  {'hosts': [(os.environ.get('REDIS_HOST', '127.0.0.1'), 6379)]},
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  True,
}

CORS_ALLOW_ALL_ORIGINS = DEBUG # Autorise tout en dev, restreint en prod via variable d'env

STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LANGUAGE_CODE      = 'fr-fr'
TIME_ZONE          = 'Africa/Algiers'
USE_I18N           = True
USE_TZ             = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'level': 'INFO',
        },
        'audit_file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'audit.log',
            'formatter': 'verbose',
            'level': 'INFO',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'audit': {
            'handlers': ['console', 'audit_file'],
            'level': 'INFO',
            'propagate': False,
        }
    },
}
