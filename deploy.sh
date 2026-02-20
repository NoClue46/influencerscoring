#!/bin/bash
set -e

IMAGE_NAME="influencer-scoring"
CONTAINER_NAME="influencer-scoring"

# Кастомные пути для volumes (можно переопределить через env)
DATA_PATH="${DATA_PATH:-/home/ai-user/inf/app/data}"
DB_VOLUME_PATH="${DB_VOLUME_PATH:-${DB_PATH:-/home/ai-user/inf/app}}"
APP_DB_PATH="${APP_DB_PATH:-file:/app/db/prod.db}"

echo "Pulling latest changes..."
git pull

echo "Building Docker image..."
sudo docker build -t "$IMAGE_NAME" .

echo "Stopping old container..."
sudo docker stop "$CONTAINER_NAME" 2>/dev/null || true
sudo docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "Applying Drizzle schema..."
sudo docker run --rm \
  -e DB_PATH="$APP_DB_PATH" \
  -v "$DB_VOLUME_PATH:/app/db" \
  "$IMAGE_NAME" bunx drizzle-kit push --force

echo "Starting new container..."
sudo docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 4141:4141 \
  --env-file .env \
  -e DB_PATH="$APP_DB_PATH" \
  -v "$DATA_PATH:/app/data" \
  -v "$DB_VOLUME_PATH:/app/db" \
  "$IMAGE_NAME"

echo "Done!"
sudo docker ps | grep "$CONTAINER_NAME"
