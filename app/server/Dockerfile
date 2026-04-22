# app/server/Dockerfile
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copiamos los archivos maestros de la raíz 
COPY package.json package-lock.json ./

# Copiamos el package.json específico del servidor manteniendo su estructura
COPY app/server/package.json ./app/server/

# Lanzamos npm ci apuntando SOLO al workspace del servidor
RUN npm ci -w app/server --omit=dev && npm cache clean --force

# Copiamos todo el código fuente de la nueva carpeta src
COPY app/server/src ./app/server/src

# Cambiamos el directorio de trabajo a la carpeta del servidor para arrancar
WORKDIR /usr/src/app/app/server

# Ejecutar como usuario no root
USER node

EXPOSE 3001

CMD ["node", "src/index.js"]