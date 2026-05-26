import axios from 'axios';
import { Platform } from 'react-native';

let tokenMemory: string | null = null;

export const setAuthToken = (token: string | null) => {
  tokenMemory = token;
};

export const getAuthToken = () => {
  return tokenMemory;
};

// Dynamically determine the API base URL based on platform
const getBaseUrl = () => {
  // Check if user set an environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Standard development loopbacks: Android emulator -> 10.0.2.2, iOS / Web -> localhost
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token if it exists
api.interceptors.request.use(
  async (config) => {
    if (tokenMemory) {
      config.headers.Authorization = `Bearer ${tokenMemory}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
