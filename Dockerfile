# /Dockerfile

FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# 1. Usamos la imagen oficial de Nginx SIN privilegios de root (Fix S6471)
FROM nginxinc/nginx-unprivileged:alpine

# 2. Copiamos la build
COPY --from=build /app/dist /usr/share/nginx/html

# 3. Exponemos el puerto 8080 (los puertos por debajo de 1024 requieren root)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]