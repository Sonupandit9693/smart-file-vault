#!/bin/sh

# Ensure directories exist and have proper permissions
mkdir -p /app/data
mkdir -p /app/media/uploads
mkdir -p /app/logs

# Set proper permissions
chmod -R 777 /app/data
chmod -R 777 /app/media
chmod -R 777 /app/logs

# Run migrations
echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

# Start server with improved logging
echo "Starting server..."
gunicorn --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 4 \
    --timeout 120 \
    --log-level=debug \
    --error-logfile=/app/logs/gunicorn-error.log \
    --access-logfile=/app/logs/gunicorn-access.log \
    --capture-output \
    --enable-stdio-inheritance \
    --log-file=/app/logs/gunicorn.log \
    core.wsgi:application
