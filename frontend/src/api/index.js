import axios from 'axios';
import { USE_MOCK, API_BASE } from './config';
import {
  mockLogin, mockSignup, mockPredict, mockDashboardStats,
  mockApplications, mockGetApplication, mockOverride,
} from './mock';

const http = axios.create({ baseURL: API_BASE });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(credentials) {
  // 1. Default Hardcoded Credentials for Demo/Prototype Access
  if (credentials.officer_id === 'agent@example.com' && credentials.password === 'password-12345') {
    return {
      token: 'mock-jwt-token-agent-' + Date.now(),
      officer: {
        id: 'OFF-AGENT',
        name: 'Demo Agent',
        branch: 'Global Operations',
        region: 'Digital',
        email: 'agent@example.com'
      }
    };
  }

  if (USE_MOCK) return mockLogin(credentials);
  const { data } = await http.post('/api/auth/login', credentials);
  return data;
}

export async function signup(payload) {
  if (USE_MOCK) return mockSignup(payload);
  const { data } = await http.post('/api/auth/signup', payload);
  return data;
}

export async function predict(formData) {
  if (USE_MOCK) return mockPredict(formData);
  const { data } = await http.post('/api/predict', formData);
  return data;
}

export async function getDashboardStats() {
  if (USE_MOCK) return mockDashboardStats();
  const { data } = await http.get('/api/dashboard/stats');
  return data;
}

export async function getApplications() {
  if (USE_MOCK) return mockApplications();
  const { data } = await http.get('/api/applications');
  return data;
}

export async function getApplication(id) {
  if (USE_MOCK) return mockGetApplication(id);
  const { data } = await http.get(`/api/applications/${id}`);
  return data;
}

export async function submitOverride(id, payload) {
  if (USE_MOCK) return mockOverride(id, payload);
  const { data } = await http.post(`/api/decision/override`, { application_id: id, ...payload });
  return data;
}
