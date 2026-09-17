FROM node:20-bookworm-slim

# Instalar Chromium, Git e dependências necessárias
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Configurar Puppeteer para usar Chromium do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3333
ENV NODE_ENV=production

CMD ["npm", "start"]
