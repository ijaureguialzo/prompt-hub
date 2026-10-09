# --- Build stage: install ALL deps, then prune to production ---
ARG NODE_VERSION=26-slim
FROM node:${NODE_VERSION} AS build
WORKDIR /app
# npm ci: reproducible installs straight from package-lock.json
COPY package*.json ./
RUN npm ci && npm prune --omit=dev
COPY . .

# --- Runtime: minimal, non-root ---
ARG NODE_VERSION=26-slim
FROM node:${NODE_VERSION}
WORKDIR /app
COPY --from=build /app .
# The node image ships an unprivileged `node` user — don't run as root
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
