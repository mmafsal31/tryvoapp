#!/usr/bin/env bash
set -e

echo "🚀 Starting backend build for Render..."

# Move to the backend directory
cd "$(dirname "$0")"

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Auto-create superuser (if it doesn’t exist)
python manage.py createsuperuser --noinput || true

# Collect static files
python manage.py collectstatic --noinput

echo "🎉 Backend build completed successfully!"
