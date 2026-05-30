# Aislamiento del entorno de ejecución basado en Alpine para minimizar la superficie de ataque
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copia de dependencias desde la raíz del monorepo
COPY package.json package-lock.json ./

# Aislamiento del contexto del workspace del servidor
COPY app/server/package.json ./app/server/

# Instalación de dependencias (solo producción) acotada al workspace específico
RUN npm ci -w app/server --omit=dev && npm cache clean --force

# Inyección del código fuente
COPY app/server/src ./app/server/src

WORKDIR /usr/src/app/app/server

# Ejecución bajo un usuario sin permisos de administrador (root)
USER node

EXPOSE 3001

CMD ["node", "src/index.js"]