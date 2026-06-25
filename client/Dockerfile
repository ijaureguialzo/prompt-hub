ARG NODE_VERSION
FROM node:${NODE_VERSION} AS build
WORKDIR /app
ARG VITE_API_URL=/api
COPY package*.json ./
RUN npm install
COPY . .
RUN VITE_API_URL=${VITE_API_URL} npm run build

ARG NODE_VERSION
FROM node:${NODE_VERSION}
WORKDIR /app
ARG VITE_API_URL=/api
RUN npm install -g serve
COPY --from=build /app/dist .
EXPOSE 5173
CMD ["serve", "-s", ".", "-l", "5173"]
