import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 5 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], 
    http_req_duration: ['p(95)<2000'], // Aumentado a 2000ms para equipos más lentos
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://127.0.0.1:3002/api';

// El setup se ejecuta una única vez. Se hace el login aquí para evitar bloqueos por rate limiting
export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    name: 'admin',
    password: 'admin123',
  }), { headers: { 'Content-Type': 'application/json' } });

  return { token: loginRes.json('accessToken') };
}

export default function main(data) {
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`
  };

  const missionsRes = http.get(`${BASE_URL}/missions`, { headers: authHeaders });
  check(missionsRes, { 'misiones obtenidas': (r) => r.status === 200 });

  const dataRes = http.get(`${BASE_URL}/robot/datos`, { headers: authHeaders });
  check(dataRes, { 'datos agronómicos obtenidos': (r) => r.status === 200 });

  const stateRes = http.get(`${BASE_URL}/robot/estado`, { headers: authHeaders });
  check(stateRes, { 'estado obtenido': (r) => r.status === 200 });

  sleep(1);
}
