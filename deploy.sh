#!/bin/bash
set -e

IMAGE_NAME="influencer-scoring"
CONTAINER_NAME="influencer-scoring"

# Кастомные пути для volumes (можно переопределить через env)
DATA_PATH="${DATA_PATH:-/home/ai-user/inf/app/data}"
DB_PATH="${DB_PATH:-/home/ai-user/inf/app}"

echo "Pulling latest changes..."
git pull

echo "Building Docker image..."
sudo docker build -t $IMAGE_NAME .

echo "Stopping old container..."
sudo docker stop $CONTAINER_NAME 2>/dev/null || true
sudo docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Running migrations..."
sudo docker run --rm \
  -e DATABASE_URL=file:///app/db/prod.db \
  -v $DB_PATH:/app/db \
  $IMAGE_NAME bunx prisma migrate deploy

echo "Starting new container..."
sudo docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env \
  -e DATABASE_URL=file:///app/db/prod.db \
  -v $DATA_PATH:/app/data \
  -v $DB_PATH:/app/db \
  $IMAGE_NAME

echo "Done!"
sudo docker ps | grep $CONTAINER_NAME
