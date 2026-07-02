# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 빌드 시점에 API base URL 주입 (미지정 시 상대 경로 '' 사용 → nginx가 /api를 백엔드로 프록시)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=back:8080

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://127.0.0.1:80/ >/dev/null 2>&1 || exit 1
