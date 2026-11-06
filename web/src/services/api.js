import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Downtime notice check & error handling
api.interceptors.response.use(
  (response) => {
    // Check 24-hour scheduled downtime notice header (NFR Reliability)
    const downtimeHeader = response.headers['x-ddu-downtime-notice'];
    if (downtimeHeader) {
      const decodedMessage = decodeURIComponent(downtimeHeader);
      window.dispatchEvent(
        new CustomEvent('ddu-downtime-notice', { detail: { message: decodedMessage } })
      );
    }
    return response;
  },
  (error) => {
    if (error.response) {
      // 401 Unauthorized: Session timeout or invalid token
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }
    } else if (error.code === 'ERR_NETWORK') {
      console.warn('[Network Notice]: Offline or server connection failed. Retrying...');
    }
    return Promise.reject(error);
  }
);

export default api;
