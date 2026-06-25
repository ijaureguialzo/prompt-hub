ARG NODE_VERSION
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG NODE_VERSION
FROM node:${NODE_VERSION}
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm install --production
COPY --from=build /app .
EXPOSE 3000
CMD ["node", "src/server.js"]
