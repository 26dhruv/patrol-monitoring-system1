import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
console.log('API_URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only redirect to login on 401 if not already on login page
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    // Log all API errors for debugging
    console.error('API error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return api.get('/auth/logout');
  },
};

// User services
export const userService = {
  getAllUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getOfficers: () => api.get('/users/officers'),
  updateUserStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
  getUserLogs: (userId) => api.get(`/users/${userId}/logs`),
};

// Patrol services
export const patrolService = {
  getAllPatrols: (params) => api.get('/patrol', { params }),
  getPatrol: (id) => api.get(`/patrol/${id}`),
  createPatrol: (patrolData) => api.post('/patrol', patrolData),
  updatePatrol: (id, patrolData) => api.put(`/patrol/${id}`, patrolData),
  deletePatrol: (id) => api.delete(`/patrol/${id}`),
  startPatrol: (id, coordinates) => api.put(`/patrol/${id}/start`, { coordinates }),
  createPatrolLog: (patrolId, logData) => api.post(`/patrol/${patrolId}/logs`, logData),
  getPatrolLogs: (patrolId) => api.get(`/patrol/${patrolId}/logs`),
  getPatrolOfficers: (patrolId) => api.get(`/patrol/${patrolId}/officers`),
  completeCheckpoint: (patrolId, checkpointId, data) => api.post(`/patrol/${patrolId}/checkpoint/${checkpointId}`, data),
  completePatrol: (patrolId, data) => api.put(`/patrol/${patrolId}/complete`, data),
  getDashboardStats: () => api.get('/patrol/dashboard-stats'),
  getActivePatrols: () => api.get('/patrol/active'),
};

// Location services
export const locationService = {
  getAllLocations: (params) => api.get('/locations', { params }),
  getLocation: (id) => api.get(`/locations/${id}`),
  createLocation: (locationData) => api.post('/locations', locationData),
  updateLocation: (id, locationData) => api.put(`/locations/${id}`, locationData),
  deleteLocation: (id) => api.delete(`/locations/${id}`),
};

// Incident services
export const incidentService = {
  getAllIncidents: (params) => api.get('/incidents', { params }),
  getIncident: (id) => api.get(`/incidents/${id}`),
  createIncident: (incidentData) => api.post('/incidents', incidentData),
  updateIncident: (id, incidentData) => api.patch(`/incidents/${id}`, incidentData),
  deleteIncident: (id) => api.delete(`/incidents/${id}`),
  addNote: (id, noteData) => api.post(`/incidents/${id}/notes`, noteData),
  addAction: (id, actionData) => api.post(`/incidents/${id}/actions`, actionData),
  assignIncident: (id, officerIds) => api.patch(`/incidents/${id}/assign`, { assignedTo: officerIds }),
  updateStatus: (id, status) => api.patch(`/incidents/${id}/status`, { status }),
  getIncidentStats: () => api.get('/incidents/stats'),
};

export default api; 