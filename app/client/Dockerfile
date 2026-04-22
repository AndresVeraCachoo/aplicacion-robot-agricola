# app/client/Dockerfile

# --- Etapa 1: Compilación (Build) ---
FROM node:20-alpine AS build

# Argumentos para Vite 
ARG VITE_API_URL
ARG VITE_SOCKET_URL

# Establecemos las variables de entorno para que Vite las vea al construir
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

WORKDIR /app

# Copiamos los archivos maestros de la raíz
COPY package.json package-lock.json ./

# Copiamos el package.json específico del cliente manteniendo su estructura
COPY app/client/package.json ./app/client/

# Lanzamos npm ci apuntando SOLO al workspace del cliente
RUN npm ci -w app/client

# Copiamos los archivos de configuración
COPY app/client/vite.config.js app/client/eslint.config.js app/client/index.html ./app/client/

# Copiamos las carpetas de recursos y código fuente
COPY app/client/public ./app/client/public
COPY app/client/src ./app/client/src

# Cambiamos el directorio al cliente y construimos (Build)
WORKDIR /app/app/client
RUN npm run build


# --- Etapa 2: Producción con Nginx Unprivileged ---
FROM nginxinc/nginx-unprivileged:alpine

# Limpiamos configuración por defecto
RUN rm /etc/nginx/conf.d/default.conf

# Copiamos nuestra configuración de Nginx (con la ruta del monorepo)
COPY app/client/nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos estáticos generados en la Etapa 1 al directorio de Nginx
COPY --from=build /app/app/client/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]