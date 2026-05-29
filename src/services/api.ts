import axios from 'axios';
import { Platform } from 'react-native';

let tokenMemory: string | null = null;

export const setAuthToken = (token: string | null) => {
  tokenMemory = token;
};

export const getAuthToken = () => {
  return tokenMemory;
};

/**
 * Get the backend API base URL.
 * - Expo env variable EXPO_PUBLIC_API_URL takes highest priority.
 * - For physical Android/iOS devices on the same Wi-Fi, use machine IP.
 * - For Android emulator, use 10.0.2.2 (loopback alias).
 * - For iOS simulator / web, use localhost.
 */
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Your machine's local IP address on the current Wi-Fi network.
  // Update this if your IP changes.
  const MACHINE_IP = '10.49.249.9';

  if (Platform.OS === 'android') {
    // On physical Android, use machine IP.
    // On Android emulator, use 10.0.2.2.
    return `http://${MACHINE_IP}:5000/api`;
  }
  // iOS physical + simulator, web
  return `http://${MACHINE_IP}:5000/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token if it exists and log request details
api.interceptors.request.use(
  async (config) => {
    console.log(`[API Request] 🚀 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data) {
      console.log('[API Request Body]', JSON.stringify(config.data, null, 2));
    }
    if (tokenMemory) {
      config.headers.Authorization = `Bearer ${tokenMemory}`;
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Surface clear error messages and log responses
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ✅ ${response.status} ${response.config.url}`);
    if (response.data) {
      console.log('[API Response Data]', JSON.stringify(response.data, null, 2));
    }
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        `[API Error Response] ❌ ${error.response.status} ${error.config?.url}`,
        JSON.stringify(error.response.data, null, 2)
      );
    } else if (error.request) {
      console.error('[API Network Error] ❌ No response received from server:', error.message);
      error.message = 'Network error — check your Wi-Fi or server is running.';
    } else {
      console.error('[API Configuration Error] ❌', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
