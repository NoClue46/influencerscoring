FROM oven/bun:1.3.5-alpine AS base

# Установка ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Копирование package.json и lock файлов
COPY package.json bun.lock* ./

# Установка зависимостей
RUN bun install --frozen-lockfile

# Копирование Prisma schema и генерация клиента
COPY prisma ./prisma
RUN bunx prisma generate

# Копирование исходного кода
COPY . .

# Создание директории для данных
RUN mkdir -p /app/data

# Expose порт (Hono по умолчанию 3000)
EXPOSE 3000

# Запуск приложения
CMD ["bun", "run", "src/index.ts"]
