import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const PRIMARY_WIFI_IP = '10.237.248.129';

export const getDetectedIp = () => {
  try {
    // Safely attempt to require expo-constants if available
    const ConstantsModule = require('expo-constants');
    const Constants = ConstantsModule.default || ConstantsModule;
    const candidates = [
      Constants?.expoConfig?.hostUri,
      Constants?.manifest?.debuggerHost,
      Constants?.manifest2?.extra?.expoGo?.debuggerHost,
      Constants?.manifest2?.extra?.expoClient?.hostUri,
      Constants?.linkingUri,
      Constants?.experienceUrl,
    ];

    for (const c of candidates) {
      if (typeof c === 'string' && c.length > 0) {
        const match = c.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (match && match[1] && match[1] !== '127.0.0.1') {
          return match[1];
        }
      }
    }
  } catch (e) {
    // expo-constants may not be linked or installed in some environments
  }
  return null;
};

export const getDefaultBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // 1. Try detected IP from Expo Go if valid and not localhost
  const detected = getDetectedIp();
  if (detected && detected !== '127.0.0.1') {
    console.log(`[API Config] Expo detected IP: ${detected}`);
    return `http://${detected}:5000/api`;
  }

  // 2. Default to active Wi-Fi IP (192.168.137.126)
  return `http://${PRIMARY_WIFI_IP}:5000/api`;
};

const api = axios.create({
  baseURL: getDefaultBaseUrl(),
  timeout: 8000,
});

// Load any previously saved custom URL from storage
AsyncStorage.getItem('custom_server_url')
  .then((saved) => {
    if (saved && saved.trim()) {
      // Clean up dead/disconnected ethernet or stale Wi-Fi IPs from previous sessions
      if (
        saved.includes('10.235.92.174') ||
        saved.includes('192.168.137.') ||
        saved.includes('undefined')
      ) {
        console.log('[API Config] Purging obsolete saved IP: resetting to current active Wi-Fi');
        const defaultUrl = getDefaultBaseUrl();
        api.defaults.baseURL = defaultUrl;
        AsyncStorage.setItem('custom_server_url', defaultUrl);
      } else {
        api.defaults.baseURL = saved.trim();
        console.log(`[API Config] Restored saved server URL: ${api.defaults.baseURL}`);
      }
    }
  })
  .catch(() => {});

export const getServerBaseUrl = () => api.defaults.baseURL;

export const setServerBaseUrl = async (newUrl) => {
  let cleaned = (newUrl || '').trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  api.defaults.baseURL = cleaned;
  await AsyncStorage.setItem('custom_server_url', cleaned).catch(() => {});
  console.log(`[API Config] Base URL updated to: ${cleaned}`);
  return cleaned;
};

/**
 * Fast health check test against the target server URL
 */
export const checkServerHealth = async (targetUrl) => {
  let testUrl = (targetUrl || api.defaults.baseURL || '').trim().replace(/\/+$/, '');
  if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
    testUrl = `http://${testUrl}`;
  }
  if (!testUrl.endsWith('/api')) {
    testUrl = `${testUrl}/api`;
  }

  try {
    const res = await axios.get(`${testUrl}/health`, { timeout: 4000 });
    return {
      success: true,
      status: res.data?.status || 'healthy',
      message: res.data?.service || 'Dire Dawa University API reachable!',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      message: `Cannot reach server at ${testUrl}. Check IP address.`,
    };
  }
};

// Request interceptor: attach auth token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: graceful logging on network error
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
