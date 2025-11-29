import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://2ye3vakg5j.execute-api.ap-south-1.amazonaws.com/Prod',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      // Clean the token - remove any extra quotes or whitespace
      const cleanToken = token.replace(/["']/g, '').trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
    }
    
    // Ensure proper headers for all requests
    config.headers['Content-Type'] = 'application/json';
    
    console.log('API Request:', config.method?.toUpperCase(), config.url, {
      headers: config.headers,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
