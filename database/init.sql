/* database/init.sql */

-- CREACIÓN DE TABLAS

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (
        role IN (
            'admin',
            'operador',
            'usuario'
        )
    )
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

-- INSERCIÓN DE DATOS DE PRUEBA

INSERT INTO
    usuarios (id, name, password, role)
VALUES (
        6,
        'admin',
        '$2b$10$xtY.XJfWtGVrvpfJMUcgZe9DtGGmsatDO2ALPDAKmeWTzruB6Z5yG',
        'admin'
    ),
    (
        7,
        'operador',
        '$2b$10$gk1lc.1LnH.9Ocn/gzJMTuDGZDD597zy9CVQojjHV51tGgbkcPtiq',
        'operador'
    ),
    (
        8,
        'usuario',
        '$2b$10$ogtavDcpOQWKRjqmxZNvfuSe4c5joB4592jr5ku6XdH0VNjgCtytO',
        'usuario'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO
    robot_estado (
        id,
        battery_percentage,
        battery_status,
        battery_voltage,
        battery_temperature,
        battery_time_remaining,
        system_status,
        system_speed,
        system_heading,
        current_lat,
        current_lon
    )
VALUES (
        1,
        32,
        'IDLE',
        24.10,
        32.00,
        '2h 05m',
        'WORKING',
        19.66,
        90,
        42.3629649,
        -3.6974904
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO
    misiones (
        id,
        nombre,
        tipo_tarea,
        ancho_trabajo,
        angulo_pasada,
        bateria_minima,
        area_trabajo
    )
VALUES (
        2,
        'prueba1',
        'Humedad, Temp. Suelo, pH, N-P-K, Rad. Solar',
        2.00,
        45.00,
        20,
        '{"type": "Polygon", "coordinates": [[[-3.699072, 42.36397], [-3.700059, 42.362857], [-3.697516, 42.362765], [-3.699072, 42.36397]]]}'
    ),
    (
        3,
        'prueba2',
        'Humedad, Temp. Suelo, pH, N-P-K, Rad. Solar',
        2.00,
        0.00,
        20,
        '{"type": "Polygon", "coordinates": [[[-3.699914, 42.362401], [-3.699914, 42.363372], [-3.697811, 42.363372], [-3.697811, 42.362401], [-3.699914, 42.362401]]]}'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO
    ejecuciones_mision (id, mision_id, estado)
VALUES (1, 2, 'en_curso'),
    (2, 3, 'en_curso')
ON CONFLICT (id) DO NOTHING;

INSERT INTO
    robot_datos (
        id,
        lat,
        lon,
        humedad,
        temperatura_suelo,
        ph,
        nitrogeno,
        fosforo,
        potasio,
        radiacion_solar
    )
VALUES (
        11397,
        42.3627298,
        -3.6990620,
        60.30,
        25.80,
        6.8,
        50.00,
        30.00,
        40.00,
        500.00
    ),
    (
        11398,
        42.3627298,
        -3.6990620,
        58.10,
        26.60,
        6.7,
        50.00,
        30.00,
        40.00,
        500.00
    ),
    (
        11399,
        42.3627298,
        -3.6990620,
        57.70,
        25.90,
        6.6,
        50.00,
        30.00,
        40.00,
        500.00
    )
ON CONFLICT (id) DO NOTHING;

-- AJUSTAR SECUENCIAS
-- Esto evita errores al insertar nuevos datos diciendo "la llave primaria ya existe"
SELECT setval( 'usuarios_id_seq', ( SELECT MAX(id) FROM usuarios ) );

SELECT setval( 'misiones_id_seq', ( SELECT MAX(id) FROM misiones ) );

SELECT setval(
        'ejecuciones_mision_id_seq', (
            SELECT MAX(id)
            FROM ejecuciones_mision
        )
    );

SELECT setval(
        'robot_datos_id_seq', (
            SELECT MAX(id)
            FROM robot_datos
        )
    );