import axios from 'axios';

// Detectar entorno: si corre en puerto de desarrollo local Vite (5173), apunta directo a :5000
// En producción (detrás de Nginx con SSL o dominio sargentos.com.bo), usa la ruta relativa '/api'
const isDevServer = typeof window !== 'undefined' && window.location.port === '5173';

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (isDevServer) {
    return `http://${window.location.hostname}:5000/api`;
  }
  return '/api';
};

export const getSocketUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (isDevServer) {
    return `http://${window.location.hostname}:5000`;
  }
  // En producción, usa el origen actual (window.location.origin), lo que usa wss:// sobre https:// automáticamente
  return typeof window !== 'undefined' ? window.location.origin : '';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });

  failedQueue = [];
};

export const setupInterceptors = (store: any) => {
  // Request Interceptor: Attach Access Token from Redux state
  api.interceptors.request.use(
    (config) => {
      const token = store.getState().auth.accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: Silent Token Rotation on 401 errors
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Avoid looping if the error was on the refresh endpoint itself
      if (originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Trigger refresh token endpoint
          // The backend expects the refresh token in the HttpOnly cookie, which is sent automatically
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {},
            { withCredentials: true }
          );

          const { accessToken } = response.data.data;

          // Dispatch updated token to Redux
          store.dispatch({
            type: 'auth/tokenRefreshed',
            payload: { accessToken },
          });

          processQueue(null, accessToken);
          isRefreshing = false;

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;

          // Force logout in Redux store
          store.dispatch({ type: 'auth/logout' });
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};
