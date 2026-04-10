# server/Dockerfile
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Instalación optimizada para producción y limpieza de caché en una sola capa
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Archivos principales
COPY index.js simulator.js ./
# Carpetas funcionales
COPY config ./config
COPY middlewares ./middlewares
COPY routes ./routes
COPY scripts ./scripts

# Ejecutar como usuario no root
USER node

EXPOSE 3001

CMD ["node", "index.js"]