#!/usr/bin/env bash
set -e

echo "Starting backend build for Render..."

# Go to the backend folder
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
