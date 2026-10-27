# Etapa 1: compila as dependências (o better-sqlite3 precisa de python/make/g++)
FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Etapa 2: imagem final, sem as ferramentas de compilação
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/
RUN mkdir -p /data
ENV DB_PATH=/data/catraca.db
EXPOSE 3000
CMD ["node", "src/server.js"]

