#!/usr/bin/env bash
set -e

echo "Starting backend build for Render..."

# Navigate to the folder where this script lives
cd "$(dirname "$0")"

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

echo "Backend build completed successfully!"

# Start Gunicorn with correct module path
# Your Django wsgi.py is in backend/backend/wsgi.py, so the module path is backend.backend.wsgi
echo "Starting Gunicorn..."
gunicorn backend.backend.wsgi:application --bind 0.0.0.0:$PORT
