"""
Django settings for Tryvo Backend.
Production-ready configuration for Render + React frontend.
"""

from pathlib import Path
from datetime import timedelta
import os
import mimetypes

# Ensure mp4 mime type
mimetypes.add_type("video/mp4", ".mp4", True)

# ----------------------------
# BASE DIRECTORY (CORRECTED)
# ----------------------------
# BASE_DIR = backend/
BASE_DIR = Path(__file__).resolve().parent


# ----------------------------
# SECURITY
# ----------------------------
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-dev-key")

# IMPORTANT — ENABLE DEBUG FOR LOCAL TESTING
DEBUG = True

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "tryvobackend.onrender.com",
    "tryvo.netlify.app",
]


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
    "core.middleware.media_cors.MediaCorsMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",

    # Whitenoise for static (DO NOT SERVE MEDIA)
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
ROOT_URLCONF = "urls"
WSGI_APPLICATION = "wsgi.application"


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
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# ----------------------------
# AUTH
# ----------------------------
AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ----------------------------
# INTERNATIONALIZATION
# ----------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ----------------------------
# STATIC / MEDIA (FIXED)
# ----------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Correct media serving
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
# BASE_DIR = backend/ so MEDIA_ROOT = backend/media


# ----------------------------
# CORS
# ----------------------------
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://tryvo.netlify.app",
    "https://tryvobackend.onrender.com",
]

CSRF_TRUSTED_ORIGINS = [
    "https://tryvo.netlify.app",
    "https://tryvobackend.onrender.com",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]


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


# ----------------------------
# DEFAULT PRIMARY KEY
# ----------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
