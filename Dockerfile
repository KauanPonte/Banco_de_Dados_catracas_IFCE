# Imagem base: Node.js 20 versão leve (Alpine Linux)
FROM node:20-alpine

# Instala dependências nativas necessárias para o better-sqlite3 compilar
RUN apk add --no-cache python3 make g++

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia só os arquivos de dependência primeiro (aproveita cache do Docker)
COPY package*.json ./

# Instala as dependências de produção
RUN npm install --production

# Copia o restante do código-fonte
COPY src/ ./src/
COPY public/ ./public/

# Cria o diretório de dados onde o banco SQLite será armazenado
RUN mkdir -p /data

# Porta que o app usa
EXPOSE 3000

# Variável de ambiente para o caminho do banco (usado pelo database.js)
ENV DB_PATH=/data/catraca.db

# Comando para iniciar o servidor
CMD ["node", "src/server.js"]
