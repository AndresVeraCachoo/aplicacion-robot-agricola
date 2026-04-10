# /Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copiamos la configuración base
COPY vite.config.js eslint.config.js index.html ./
# Copiamos las carpetas de recursos y código fuente
COPY public ./public
COPY src ./src

# Inyección de variables de entorno para Vite 
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# --- ETAPA DE PRODUCCIÓN ---
FROM nginxinc/nginx-unprivileged:alpine

# Limpiamos configuración por defecto y metemos la nuestra
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Solo copiamos los archivos estáticos minificados 
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]