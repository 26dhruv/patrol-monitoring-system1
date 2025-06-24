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
    // Handle authentication errors
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle authentication errors (401)
      if (status === 401) {
        // Get current pathname
        const currentPath = window.location.pathname;
        
        // Only redirect to login if not already on login page and auth-related paths
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          // Check if this is a fresh login attempt (within last 5 seconds)
          const lastLoginAttempt = localStorage.getItem('lastLoginAttempt');
          const now = Date.now();
          
          if (!lastLoginAttempt || (now - parseInt(lastLoginAttempt)) > 5000) {
            // Clear authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Store the current location to redirect back after login
            localStorage.setItem('returnUrl', currentPath);
            
            // Store session expiration message
            const sessionMessage = data.message || 'Your session has expired. Please login again.';
            localStorage.setItem('sessionMessage', sessionMessage);
            
            // Show a user-friendly toast or alert if available in the app
            if (window.showToast) {
              window.showToast(sessionMessage, 'error');
            }
            
            // Redirect to login page
            window.location.href = '/login';
          } else {
            // This might be a login attempt, don't redirect
            console.log('Login attempt detected, not redirecting');
          }
        }
      }
      
      // Handle authorization errors (403)
      if (status === 403) {
        console.warn('Access forbidden:', data.message || 'You do not have permission to access this resource');
        // Handle forbidden access (can redirect to a denied access page if needed)
      }
      
      // Log all API errors for debugging with more details
      console.error('API error:', {
        url: error.config?.url,
        method: error.config?.method,
        status,
        data,
        message: error.message,
        stack: import.meta.env.DEV ? error.stack : undefined
      });
      
      // Enhance error message with more details
      if (data) {
        if (data.message) {
          error.message = data.message;
        } else if (data.error) {
          error.message = data.error;
        } else if (data.msg) {
          error.message = data.msg;
        }
      }
    }
    
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
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getOfficers: () => api.get('/users/officers'),
  updateUserStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
  getUserLogs: (userId) => api.get(`/users/${userId}/logs`),
};

// Patrol services
export const patrolService = {
  getAllPatrols: (params) => {
    console.log('Making request to /patrol with params:', params);
    return api.get('/patrol', { params });
  },
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
  getOfficerPatrols: (officerId) => {
    if (!officerId) {
      console.error('Officer ID is required for getOfficerPatrols');
      return Promise.reject(new Error('Officer ID is required'));
    }
    
    // Log the URL and headers for debugging
    const token = localStorage.getItem('token');
    console.log(`Making request to get patrols for officer ID: ${officerId}`);
    console.log(`Requesting URL: ${API_URL}/patrol/officer/${officerId}`);
    console.log('Auth header present:', !!token);
    
    // Make the actual API call
    return api.get(`/patrol/officer/${officerId}`)
      .then(response => {
        console.log('Officer patrols API response:', response.status, response.data);
        return response;
      })
      .catch(error => {
        // Enhanced error logging
        console.error(`Error fetching officer patrols:`, error.message);
        if (error.response) {
          console.error('Error response status:', error.response.status);
          console.error('Error response data:', error.response.data);
        }
        // If the endpoint doesn't exist, we'll return a structured error for better handling
        throw new Error(`Failed to fetch officer patrols: ${error.message}`);
      });
  },
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
  getIncidentStats: (params) => api.get('/incidents/stats', { params }),
};

export default api; 