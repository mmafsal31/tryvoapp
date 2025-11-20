import os
from django.core.wsgi import get_wsgi_application

# This should match the actual settings.py location
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

application = get_wsgi_application()
