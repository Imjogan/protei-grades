FROM node:20-alpine AS base

# --- Этап 1: Установка зависимостей ---
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine может быть полезно для решения проблем с установкой зависимостей
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Включаем Corepack - он будет управлять версиями yarn/npm/pnpm
# на основе поля "packageManager" в package.json
RUN corepack enable

# Устанавливаем зависимости
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .yarnrc.yml ./
COPY .yarn ./.yarn
# Используйте `npm ci` для чистой установки в CI/CD и Docker
RUN \
    if [ -f yarn.lock ]; then yarn install --immutable; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# --- Этап 2: Сборка приложения ---
FROM base AS builder
WORKDIR /app
# Копируем зависимости из предыдущего этапа
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SERVER_URL_ARG
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL_ARG}

RUN \
    if [ -f yarn.lock ]; then yarn run build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# --- Этап 3: Финальный образ для запуска ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Отключаем телеметрию
# ENV NEXT_TELEMETRY_DISABLED 1

# Создаем группу и пользователя для запуска приложения (безопасность)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем только необходимые для запуска артефакты из этапа сборки
COPY --from=builder /app/public ./public

# Автоматическое копирование файлов из standalone вывода
# Необходимо настроить `output: 'standalone'` в next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

ENV HOSTNAME "0.0.0.0"

# Запускаем сервер Node.js (который включает Next.js сервер)
CMD ["node", "server.js"]