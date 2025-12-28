#!/bin/bash
set -e

echo "Pulling latest changes..."
git pull

echo "Installing dependencies..."
npm install

echo "Running migrations..."
npx prisma migrate deploy

echo "Generating Prisma client..."
npx prisma generate

echo "Restarting application..."
pm2 restart influencerscoring || pm2 start npm --name "influencerscoring" -- run start

echo "Done!"
