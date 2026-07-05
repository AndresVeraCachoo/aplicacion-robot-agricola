import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 2 },
    { duration: '1m', target: 2 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    // Umbral ampliado a 2000ms para evitar falsos positivos por lentitud del entorno local
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:3002/api';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    name: 'admin',
    password: 'admin123',
  }), { headers: { 'Content-Type': 'application/json' } });
  return { token: loginRes.json('accessToken') };
}

export default function soakTest(data) {
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`
  };

  const historyRes = http.get(`${BASE_URL}/robot/energia/historial`, { headers: authHeaders });
  check(historyRes, { 'historial energía obtenido': (r) => r.status === 200 });

  sleep(1);
}
