# server/Dockerfile

FROM node:20-alpine

ENV NODE_ENV=production

# 1. Creamos la carpeta y le damos permisos al usuario 'node' (usuario sin privilegios)
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app

WORKDIR /usr/src/app

# 2. Obligamos a Docker a usar el usuario 'node' a partir de aquí (Fix S6471)
USER node

# 3. Copiamos los archivos asegurando que el dueño es 'node' (Mejora S6470)
COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

EXPOSE 3001

CMD ["node", "index.js"]