#!/usr/bin/env bash
set -e

echo "🚀 Starting backend build for Render..."

# Move into backend directory
cd backend

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Auto-create superuser
python manage.py createsuperuser --noinput || true

# Collect static files
python manage.py collectstatic --noinput

echo "🎉 Backend build completed successfully!"
