#!/bin/bash
set -e

IMAGE_NAME="influencer-scoring"
CONTAINER_NAME="influencer-scoring"

# Кастомные пути для volumes (можно переопределить через env)
DATA_PATH="${DATA_PATH:-$(pwd)/data}"
DB_PATH="${DB_PATH:-$(pwd)/prisma}"

echo "Pulling latest changes..."
git pull

echo "Building Docker image..."
docker build -t $IMAGE_NAME .

echo "Stopping old container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Running migrations..."
docker run --rm \
  -e DATABASE_URL=file:///app/db/dev.db \
  -v $DB_PATH:/app/db \
  $IMAGE_NAME bunx prisma migrate deploy

echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -e DATABASE_URL=file:///app/db/dev.db \
  -v $DATA_PATH:/app/data \
  -v $DB_PATH:/app/db \
  $IMAGE_NAME

echo "Done!"
docker ps | grep $CONTAINER_NAME
