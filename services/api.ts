import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';

console.log('🌐 API Service initialized with BASE_URL:', API_CONFIG.BASE_URL);

// Create axios instance with base configuration
// Use longer timeout for initial requests (20s) to handle cold starts
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 20000, // 20 seconds for initial cold start tolerance
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: any) => {
    console.log('📤 API Request:', config.method?.toUpperCase(), config.baseURL + config.url);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage and redirect to login
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper function to set API base URL dynamically
export const setApiBaseUrl = (url: string) => {
  api.defaults.baseURL = url;
};

// Helper function to get the current API base URL
export const getApiBaseUrl = () => {
  return api.defaults.baseURL;
};

// Price Reporting API functions
export const priceReportsAPI = {
  // Get user's price reports and earnings
  getUserReports: async () => {
    const response = await api.get('/price-reports');
    return response.data;
  },

  // Submit a new price report
  submitReport: async (data: {
    productId: string;
    shopId: string;
    reportedPrice: number;
    currentPrice?: number;
  }) => {
    const response = await api.post('/price-reports', data);
    return response.data;
  },

  // Search products for price reporting
  searchProducts: async (query: string, limit: number = 10) => {
    const response = await api.get(`/price-reports/products/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  },

  // Search shops that have a specific product
  searchShopsForProduct: async (productId: string, query: string, limit: number = 10) => {
    const response = await api.get(`/price-reports/products/${productId}/shops/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  },

  // Get all shops that have a specific product (no search required)
  getShopsForProduct: async (productId: string, limit: number = 50) => {
    const response = await api.get(`/price-reports/products/${productId}/shops?limit=${limit}`);
    return response.data;
  },

  // Get current price for a product at a specific shop
  getCurrentPrice: async (productId: string, shopId: string) => {
    const response = await api.get(`/price-reports/product/${productId}/shop/${shopId}/price`);
    return response.data;
  },

  // ============ ADMIN FUNCTIONS ============
  
  // Get all pending price reports for admin review
  getPendingReports: async () => {
    const response = await api.get('/price-reports/admin/pending');
    return response.data;
  },

  // Approve a price report
  approveReport: async (reportId: string, adminNotes?: string) => {
    const response = await api.post(`/price-reports/admin/approve/${reportId}`, {
      adminNotes
    });
    return response.data;
  },

  // Reject a price report
  rejectReport: async (reportId: string, adminNotes?: string) => {
    const response = await api.post(`/price-reports/admin/reject/${reportId}`, {
      adminNotes
    });
    return response.data;
  },

  // Get all price reports with optional status filter
  getAllReports: async (status?: 'PENDING' | 'APPROVED' | 'REJECTED', limit: number = 50) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    
    const response = await api.get(`/price-reports/admin/all?${params.toString()}`);
    return response.data;
  },
};
