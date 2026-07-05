import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:3002/api';

export default function scenariosTest() {
  const loginPayload = JSON.stringify({
    name: 'admin',
    password: 'admin123',
  });

  const loginHeaders = {
    'Content-Type': 'application/json',
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: loginHeaders,
  });

  check(loginRes, {
    'login exitoso (200)': (r) => r.status === 200,
  });

  const authToken = loginRes.json('accessToken');

  const iterations = 5; // Simulamos un usuario consultando historiales de forma intensiva
  for (let i = 0; i < iterations; i++) {
    // Consulta 1: Datos agronómicos
    const dataRes = http.get(`${BASE_URL}/robot/datos`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    check(dataRes, {
      'historial agronómico leído (200)': (r) => r.status === 200,
    });

    // Consulta 2: Historial de energía
    const energyRes = http.get(`${BASE_URL}/robot/energia/historial`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    check(energyRes, {
      'historial energía leído (200)': (r) => r.status === 200,
    });

    sleep(1); 
  }
}
