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

# --- Runtime: static file server, non-root ---
ARG NODE_VERSION=26-slim
FROM node:${NODE_VERSION}
WORKDIR /app
ARG VITE_API_URL=/api
RUN npm install -g serve
COPY --from=build /app/dist .
# The node image ships an unprivileged `node` user — don't run as root
USER node
EXPOSE 5173
CMD ["serve", "-s", ".", "-l", "5173"]
