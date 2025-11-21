#!/usr/bin/env bash
set -e

echo "Starting backend build for Render..."

cd "$(dirname "$0")"

python -m pip install --upgrade pip

pip install -r backend/requirements.txt

python backend/manage.py migrate

python backend/manage.py createsuperuser --noinput || true

python backend/manage.py collectstatic --noinput

echo "Backend build completed successfully!"
