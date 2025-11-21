#!/usr/bin/env bash
set -e

echo "Starting Django backend build on Render..."

# Go into the backend directory
cd backend

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Create superuser (won't fail if exists)
python manage.py createsuperuser --noinput || true

echo "Build complete!"
