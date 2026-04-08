FROM public.ecr.aws/docker/library/node:20-bullseye

# Instalar Chromium e dependências necessárias com retry e tratamento de erros
RUN set -eux; \
    # Função de retry para apt-get update
    apt_update_retry() { for i in 1 2 3 4 5; do apt-get update && return 0 || sleep $((i * 2)); done; return 1; }; \
    apt_update_retry; \
    # Instalar pacotes essenciais primeiro
    apt-get install -y --no-install-recommends ca-certificates curl; \
    # Instalar gsettings-desktop-schemas ANTES das dependências GTK (resolve cadeia de deps)
    apt_update_retry; \
    apt-get install -y --no-install-recommends \
        gsettings-desktop-schemas \
        libdbus-1-3; \
    # Instalar dependências do Chromium
    apt_update_retry; \
    apt-get install -y --no-install-recommends \
        fonts-liberation \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libgdk-pixbuf2.0-0 \
        libnspr4 \
        libnss3 \
        libx11-xcb1 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        xdg-utils; \
    # Instalar libappindicator3-1 (depende de GTK que depende de gsettings-desktop-schemas)
    apt_update_retry; \
    apt-get install -y --no-install-recommends libappindicator3-1 \
    || (apt --fix-broken install -y && apt-get install -y --no-install-recommends libappindicator3-1); \
    # Instalar Chromium por último
    apt_update_retry; \
    apt-get install -y --no-install-recommends chromium \
    || (apt --fix-broken install -y && apt-get install -y --no-install-recommends chromium); \
    # Limpar cache
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Configurar Puppeteer para usar Chromium do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3333
ENV NODE_ENV=production

CMD ["node", "src/server.js"]
