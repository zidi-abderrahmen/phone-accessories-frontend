# ---------- Build stage ----------
FROM node:22-alpine AS build

WORKDIR /app

# Lockfiles first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Rest of the source
COPY . .

# `npm run build` uses the default "production" configuration, which resolves to
# the committed environment.ts with a relative `/api` base — the run-time nginx
# only has to reverse-proxy `/api/*` to the backend.
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80