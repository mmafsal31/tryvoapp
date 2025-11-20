#!/usr/bin/env bash
set -e

echo "Starting backend build..."

# Change to the directory of this script (backend)
cd "$(dirname "$0")"

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo "Running database migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Build finished successfully!"
