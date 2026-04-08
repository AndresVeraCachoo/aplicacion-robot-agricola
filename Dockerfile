# /Dockerfile

FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# 1. Usamos la imagen oficial de Nginx SIN privilegios de root
FROM nginxinc/nginx-unprivileged:alpine

# 2. ELIMINAR configuración por defecto y COPIAR la profesional
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 3. Copiamos la build generada por Vite
COPY --from=build /app/dist /usr/share/nginx/html

# 4. Exponemos el puerto definido en tu docker-compose.yml
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]