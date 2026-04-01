-- database/init.sql

-- CREACIÓN DE TIPOS Y TABLAS
CREATE TYPE rol_usuario AS ENUM ('admin', 'operador', 'usuario');

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role rol_usuario NOT NULL
);

CREATE TABLE IF NOT EXISTS robot_estado (
    id SERIAL PRIMARY KEY,
    battery_percentage INT,
    battery_status VARCHAR(50),
    battery_voltage DECIMAL(5, 2),
    battery_temperature DECIMAL(5, 2),
    battery_time_remaining VARCHAR(50),
    system_status VARCHAR(50),
    system_speed DECIMAL(5, 2),
    system_heading INT,
    current_lat DECIMAL(10, 7),
    current_lon DECIMAL(10, 7)
);

CREATE TABLE IF NOT EXISTS misiones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo_tarea VARCHAR(100) NOT NULL,
    ancho_trabajo DECIMAL(5, 2),
    angulo_pasada DECIMAL(5, 2),
    bateria_minima INT DEFAULT 20,
    area_trabajo JSONB NOT NULL,
    puntos_interes JSONB,
    punto_retorno JSONB,
    fecha_programada TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ejecuciones_mision (
    id SERIAL PRIMARY KEY,
    mision_id INT REFERENCES misiones (id) ON DELETE CASCADE,
    estado VARCHAR(50) DEFAULT 'pendiente',
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP,
    bateria_usada INT DEFAULT 0,
    distancia_recorrida DECIMAL(10, 2) DEFAULT 0.0,
    tiempo_transcurrido INT DEFAULT 0,
    progreso INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS robot_datos (
    id SERIAL PRIMARY KEY,
    lat DECIMAL(10, 7),
    lon DECIMAL(10, 7),
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    humedad DECIMAL(5, 2),
    temperatura_suelo DECIMAL(5, 2),
    ph DECIMAL(3, 1),
    nitrogeno DECIMAL(6, 2),
    fosforo DECIMAL(6, 2),
    potasio DECIMAL(6, 2),
    radiacion_solar DECIMAL(6, 2),
    ejecucion_id INT REFERENCES ejecuciones_mision (id) ON DELETE SET NULL
);