# --- Build stage: build the SPA (needs dev deps for Vite) ---
ARG NODE_VERSION=26-slim
FROM node:${NODE_VERSION} AS build
WORKDIR /app
ARG VITE_API_URL=/api
COPY package*.json ./
# npm ci: reproducible installs straight from package-lock.json
RUN npm ci
COPY . .
RUN VITE_API_URL=${VITE_API_URL} npm run build

# --- Runtime: nginx static server ---
# nginx alpine is lighter than the previous node image (which existed only
# to run `serve`), and `serve` v14 removed the headers config, so the cache
# policy lives in nginx.conf (PLAN.md P3/21):
#   /assets/* + /favicon.svg  → immutable for a year (hashed filenames)
#   everything else           → no-cache (index.html + SPA fallback)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5173
# (No USER switch: the master must run as root to own the log files; the
# worker processes automatically drop to the unprivileged `nginx` user, and
# 5173 is an unprivileged port.)
