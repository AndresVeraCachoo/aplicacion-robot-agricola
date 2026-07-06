# AgroSkopos

<div align="center">

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=bugs)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=AndresVeraCachoo_aplicacion-robot-agricola&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=AndresVeraCachoo_aplicacion-robot-agricola)

</div>

<div align="center">

[![Production](https://img.shields.io/badge/Production-Live-brightgreen?style=for-the-badge&logo=checkmarx)](https://agroskopos.vercel.app/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://agroskopos.vercel.app/)
[![Backend on Azure](https://img.shields.io/badge/Backend-Azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white)](#)
[![CI](https://github.com/AndresVeraCachoo/aplicacion-robot-agricola/actions/workflows/ci-sonarcloud.yml/badge.svg)](https://github.com/AndresVeraCachoo/aplicacion-robot-agricola/actions/workflows/ci-sonarcloud.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

<div align="center">
  <a href="#español">🇪🇸 Leer en Español</a> &nbsp;|&nbsp; <a href="#english">🇬🇧 Read in English</a>
</div>

---

<a name="español"></a>

## 🇪🇸 Español

AgroSkopos es un sistema avanzado de telemetría, control y gestión integral para flotas de robots agrícolas autónomos. Diseñado para entornos empresariales e investigación agronómica, centraliza la toma de decisiones en campo a través de una única plataforma digital.

Los operarios pueden monitorizar el estado del robot en tiempo real (energía, sensores de suelo, radiación solar, humedad y pH), enviar comandos directos de movimiento al robot, gestionar el inicio y fin de misiones autónomas, supervisar el trazado GPS de las rutas recorridas en mapas interactivos y exportar trazabilidad completa mediante informes agronómicos detallados en formato PDF.

### Despliegue en Producción

La aplicación está actualmente desplegada y disponible en un entorno de producción seguro (HTTPS):

- **Plataforma:** [agroskopos.vercel.app](https://agroskopos.vercel.app/)
- **Credenciales de prueba:** Usuario: `admin` | Contraseña: `admin123`
- **API Interactiva (Swagger):** [api-agroskopos.swedencentral.cloudapp.azure.com/api-docs](https://api-agroskopos.swedencentral.cloudapp.azure.com/api-docs) — permite explorar y lanzar peticiones reales a todos los endpoints directamente desde el navegador sin instalar nada.

### Instalación en Local

**Requisitos previos**

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)

**1. Clonar el repositorio**

```bash
git clone https://github.com/AndresVeraCachoo/aplicacion-robot-agricola.git
cd aplicacion-robot-agricola
```

**2. Configurar el entorno**

```bash
cp .env.example .env
```

Editar `.env` con las credenciales deseadas. Los valores por defecto son válidos para desarrollo local.

**3. Desplegar los contenedores**

```bash
docker-compose up --build -d
```

La base de datos se inicializará automáticamente con datos de simulación agronómica y misiones de prueba.

**4. Acceso**

| Servicio           | URL                            |
| ------------------ | ------------------------------ |
| Interfaz web       | http://localhost:8080          |
| API Backend        | http://localhost:3001/api      |
| Swagger (API Docs) | http://localhost:3001/api-docs |

### Tecnologías

**Frontend**

- React 19, React Router DOM, Zustand (gestión de estado), TanStack Query
- Recharts (gráficas de telemetría)
- Leaflet + React Leaflet + Geoman + Leaflet.heat (mapas interactivos y heatmaps)
- i18next + react-i18next (internacionalización ES/EN/PT)
- jsPDF + html2canvas (generación de informes PDF)
- Sonner (notificaciones), Axios, date-fns
- Vite 7 + PWA Plugin

**Backend**

- Node.js, Express, Socket.io (comunicación bidireccional en tiempo real)
- Prisma ORM + PostgreSQL 15, ioredis
- BullMQ (colas de trabajo para procesamiento asíncrono)
- JWT, bcrypt, Helmet, Zod (validación)
- Swagger (documentación interactiva de la API), JSDoc
- Nodemailer (notificaciones por correo)

**Infraestructura**

- Docker + Docker Compose
- Microsoft Azure (VM Ubuntu con Nginx como proxy inverso HTTPS)
- Vercel (Serverless, Frontend)
- SonarCloud (análisis de calidad y seguridad del código)

### Testing

El proyecto cuenta con una estrategia de pruebas en múltiples capas. Todos los tests se ejecutan automáticamente en cada `push` a `main` a través de **GitHub Actions** (workflow `ci-sonarcloud.yml`), que también envía los resultados de cobertura a SonarCloud.

**Tests Unitarios** (Frontend: Vitest + Testing Library | Backend: Jest)

Cubren la lógica de servicios, utilidades y componentes individuales de forma aislada.

```bash
# Ejecutar tests unitarios de todo el monorepo
npm run test:unit

# Con informe de cobertura (genera coverage/lcov.info unificado)
npm run test:unit:cov
```

**Tests de Integración / E2E** (Jest + Supertest + Testcontainers)

Levantan contenedores reales de PostgreSQL y Redis para validar los flujos completos de la API sin mocks.

```bash
# Ejecutar tests E2E del backend
npm run test:e2e

# Con informe de cobertura
npm run test:e2e:cov
```

**Pruebas de Carga** (k6)

Cuatro escenarios para verificar la resiliencia del backend bajo diferentes patrones de tráfico:

```bash
npm run test:k6:load    # Carga nominal sostenida
npm run test:k6:stress  # Identificación del límite de ruptura
npm run test:k6:spike   # Reacción ante picos repentinos de tráfico
npm run test:k6:soak    # Detección de fugas de memoria bajo carga prolongada

# Ejecutar todos los escenarios de carga en secuencia
cd app/server && node tests/config/run-k6.js all
```

**Informes de cobertura**

Los informes HTML de cobertura se generan en las siguientes rutas tras ejecutar los tests con `--coverage`:

| Tipo                       | Ruta                                  |
| -------------------------- | ------------------------------------- |
| Tests unitarios (Frontend) | `app/client/coverage/index.html`      |
| Tests unitarios (Backend)  | `app/server/coverage/unit/index.html` |
| Tests E2E (Backend)        | `app/server/coverage/e2e/index.html`  |

**Documentación JSDoc**

La documentación del código fuente (frontend y backend) se genera con el tema `clean-jsdoc-theme`:

```bash
npm run docs
```

La documentación se genera en la carpeta `docs/`. Abre `docs/index.html` en el navegador para explorarla.

### Autores

| Rol              | Nombre                               |
| ---------------- | ------------------------------------ |
| Autor            | Andrés Vera Cacho                    |
| Tutor académico  | Rubén Ruiz González                  |
| Tutora académica | Antonia Maiara Marques do Nascimento |

_Proyecto de Fin de Grado — Universidad de Burgos (UBU)_

---

<a name="english"></a>

## 🇬🇧 English

AgroSkopos is an advanced telemetry, control, and comprehensive management system for autonomous agricultural robot fleets. Designed for enterprise environments and agronomic research, it centralizes field decision-making through a single digital platform.

Operators can monitor the robot's real-time status (energy, soil sensors, solar radiation, humidity, and pH), send direct movement commands, manage the start and end of autonomous missions, supervise GPS route traces on interactive maps, and export complete traceability through detailed agronomic PDF reports.

### Live Deployment

The application is currently deployed and available in a secure (HTTPS) production environment:

- **Platform:** [agroskopos.vercel.app](https://agroskopos.vercel.app/)
- **Test Credentials:** Username: `admin` | Password: `admin123`
- **Interactive API (Swagger):** [api-agroskopos.swedencentral.cloudapp.azure.com/api-docs](https://api-agroskopos.swedencentral.cloudapp.azure.com/api-docs) — explore and run real requests to all endpoints directly from your browser without installing anything.
- **Code Documentation (JSDoc):** Available locally only. Run `npm run docs` from the project root to generate it; the result opens at `docs/index.html`.

### Local Installation

**Prerequisites**

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

**1. Clone the repository**

```bash
git clone https://github.com/AndresVeraCachoo/aplicacion-robot-agricola.git
cd aplicacion-robot-agricola
```

**2. Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your credentials. Default values are valid for local development.

**3. Deploy containers**

```bash
docker-compose up --build -d
```

The database will be automatically seeded with agronomic simulation data and test missions on the first run.

**4. Access**

| Service            | URL                            |
| ------------------ | ------------------------------ |
| Web Interface      | http://localhost:8080          |
| API Backend        | http://localhost:3001/api      |
| Swagger (API Docs) | http://localhost:3001/api-docs |

### Technologies

**Frontend**

- React 19, React Router DOM, Zustand (state management), TanStack Query
- Recharts (telemetry charts)
- Leaflet + React Leaflet + Geoman + Leaflet.heat (interactive maps and heatmaps)
- i18next + react-i18next (ES/EN/PT internationalization)
- jsPDF + html2canvas (PDF report generation)
- Sonner (notifications), Axios, date-fns
- Vite 7 + PWA Plugin

**Backend**

- Node.js, Express, Socket.io (real-time bidirectional communication)
- Prisma ORM + PostgreSQL 15, ioredis
- BullMQ (job queues for asynchronous processing)
- JWT, bcrypt, Helmet, Zod (validation)
- Swagger (interactive API documentation), JSDoc
- Nodemailer (email notifications)

**Infrastructure**

- Docker + Docker Compose
- Microsoft Azure (Ubuntu VM with Nginx as HTTPS reverse proxy)
- Vercel (Serverless, Frontend)
- SonarCloud (code quality and security analysis)

### Local Installation

**Prerequisites**

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

**1. Clone the repository**

```bash
git clone https://github.com/AndresVeraCachoo/aplicacion-robot-agricola.git
cd aplicacion-robot-agricola
```

**2. Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your credentials. Default values are valid for local development.

**3. Deploy containers**

```bash
docker-compose up --build -d
```

The database will be automatically seeded with agronomic simulation data and test missions on the first run.

**4. Access**

| Service            | URL                            |
| ------------------ | ------------------------------ |
| Web Interface      | http://localhost:8080          |
| API Backend        | http://localhost:3001/api      |
| Swagger (API Docs) | http://localhost:3001/api-docs |

### Testing

The project includes a multi-layer testing strategy. All tests run automatically on every `push` to `main` via **GitHub Actions** (workflow `ci-sonarcloud.yml`), which also sends coverage results to SonarCloud.

**Unit Tests** (Frontend: Vitest + Testing Library | Backend: Jest)

Cover service logic, utilities, and individual components in isolation.

```bash
# Run unit tests across the entire monorepo
npm run test:unit

# With coverage report (generates unified coverage/lcov.info)
npm run test:unit:cov
```

**Integration / E2E Tests** (Jest + Supertest + Testcontainers)

Spin up real PostgreSQL and Redis containers to validate complete API flows without mocks.

```bash
# Run backend E2E tests
npm run test:e2e

# With coverage report
npm run test:e2e:cov
```

**Load Tests** (k6)

Four scenarios to verify backend resilience under different traffic patterns:

```bash
npm run test:k6:load    # Sustained nominal load
npm run test:k6:stress  # System breaking point identification
npm run test:k6:spike   # Reaction to sudden traffic spikes
npm run test:k6:soak    # Memory leak detection under prolonged load

# Run all load scenarios in sequence
cd app/server && node tests/config/run-k6.js all
```

**Coverage Reports**

HTML coverage reports are generated at the following paths after running tests with `--coverage`:

| Type                  | Path                                  |
| --------------------- | ------------------------------------- |
| Unit tests (Frontend) | `app/client/coverage/index.html`      |
| Unit tests (Backend)  | `app/server/coverage/unit/index.html` |
| E2E tests (Backend)   | `app/server/coverage/e2e/index.html`  |

**JSDoc Documentation**

The source code documentation (frontend and backend) is generated using the `clean-jsdoc-theme`:

```bash
npm run docs
```

Documentation is generated in the `docs/` folder. Open `docs/index.html` in your browser to explore it.

### Authors

| Role                | Name                                 |
| ------------------- | ------------------------------------ |
| Developer           | Andrés Vera Cacho                    |
| Academic Supervisor | Rubén Ruiz González                  |
| Academic Supervisor | Antonia Maiara Marques do Nascimento |

_Final Degree Project — University of Burgos (UBU)_
