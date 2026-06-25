FROM node:18-slim AS build
WORKDIR /app
ARG VITE_API_URL=/api
COPY package*.json ./
RUN npm install
COPY . .
RUN VITE_API_URL=${VITE_API_URL} npm run build

FROM node:18-slim
WORKDIR /app
ARG VITE_API_URL=/api
RUN npm install -g serve
COPY --from=build /app/dist .
EXPOSE 5173
CMD ["serve", "-s", ".", "-l", "5173"]
