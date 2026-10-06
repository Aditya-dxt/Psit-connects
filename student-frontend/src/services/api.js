// Central API client for PSIT Connects

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const TOKEN_KEY = 'psit_token';
export const USER_KEY = 'psit_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getUser() {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

/**
 * Common request wrapper with Bearer token & 401 handling
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle 401 Unauthorized globally
  if (response.status === 401) {
    clearSession();
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// API methods
export const api = {
  // Auth
  login: async (mobile, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ mobile, password })
    });
    if (res.token) setToken(res.token);
    if (res.user) setUser(res.user);
    return res;
  },

  // Student
  getStudentProfile: () => apiRequest('/student/profile'),
  getBuses: () => apiRequest('/buses'),
  getBus: (busId) => apiRequest(`/buses/${busId}`),
  getBusLocation: (busId) => apiRequest(`/buses/${busId}/location`),
  getRoutes: () => apiRequest('/routes'),
  getRoute: (routeId) => apiRequest(`/routes/${routeId}`),

  // Driver
  getDriverProfile: () => apiRequest('/driver/profile'),
  verifyQr: (qrCode) => apiRequest('/driver/verify-qr', {
    method: 'POST',
    body: JSON.stringify({ qrCode })
  }),
  getActiveTrip: () => apiRequest('/trips/active'),
  startTrip: () => apiRequest('/trips/start', {
    method: 'POST'
  }),
  updateTripLocation: (tripId, { lat, lng, speed = 0, accuracy = null }) => apiRequest(`/trips/${tripId}/location`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng, speed, accuracy })
  }),
  endTrip: (tripId) => apiRequest(`/trips/${tripId}/end`, {
    method: 'POST'
  })
};

export default api;
