"""
Django settings for Tryvo Backend.
Production-ready configuration for Render backend + React frontend.
"""

from pathlib import Path
from datetime import timedelta
import os

# ----------------------------
# BASE DIRECTORY
# ----------------------------
BASE_DIR = Path(__file__).resolve().parent

# ----------------------------
# SECURITY
# ----------------------------
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-dev-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "False") == "True"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

# ----------------------------
# APPLICATIONS
# ----------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",

    # Internal apps
    "core",
]

# ----------------------------
# MIDDLEWARE
# ----------------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ----------------------------
# URLS & WSGI
# ----------------------------
ROOT_URLCONF = "backend.urls"
WSGI_APPLICATION = "backend.wsgi.application"

# ----------------------------
# TEMPLATES
# ----------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ----------------------------
# DATABASE
# ----------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("SQLITE_PATH", BASE_DIR / "db.sqlite3"),
    }
}

# ----------------------------
# AUTH & PASSWORD VALIDATORS
# ----------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "core.User"

# ----------------------------
# INTERNATIONALIZATION
# ----------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ----------------------------
# STATIC / MEDIA
# ----------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [
    BASE_DIR.parent / "frontend" / "dist",  # Serve React build files if using SPA
]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ----------------------------
# REST FRAMEWORK + JWT
# ----------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

ALLOWED_HOSTS = ["tryvobackend.onrender.com"]

CORS_ALLOWED_ORIGINS = [
    "tryvo.netlify.app",  # replace with your deployed frontend
]
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True  # needed if you send cookies

# ----------------------------
# DEFAULT PRIMARY KEY
# ----------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
