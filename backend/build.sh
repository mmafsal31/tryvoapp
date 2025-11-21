#!/usr/bin/env bash
set -e

echo "🚀 Starting backend build for Render..."

cd backend

python -m pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser --noinput || true
python manage.py collectstatic --noinput

echo "🎉 Backend build completed successfully!"
