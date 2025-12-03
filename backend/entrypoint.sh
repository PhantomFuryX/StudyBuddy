#!/bin/bash
set -e

echo "🌱 Running database seed..."
python -m seed.seed_database

echo "🚀 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
