#!/usr/bin/env bash
set -o errexit

# Move to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput
