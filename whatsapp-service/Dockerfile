FROM node:20-alpine

# Baileys doesn't need Chromium/Puppeteer!
# Much lighter and faster image

# Install git (required by Baileys dependencies)
RUN apk add --no-cache git

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3333
ENV NODE_ENV=production

CMD ["node", "src/server.js"]


