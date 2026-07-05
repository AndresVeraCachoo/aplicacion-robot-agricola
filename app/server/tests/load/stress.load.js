import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 10 },
    { duration: '10s', target: 10 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], 
    http_req_duration: ['p(95)<500'],
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

export default function stressTest(data) {
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`
  };

  const missionsRes = http.get(`${BASE_URL}/missions`, { headers: authHeaders });
  check(missionsRes, { 'misiones obtenidas (stress)': (r) => r.status === 200 });

  const dataRes = http.get(`${BASE_URL}/robot/datos`, { headers: authHeaders });
  check(dataRes, { 'datos obtenidos (stress)': (r) => r.status === 200 });

  sleep(0.5);
}
