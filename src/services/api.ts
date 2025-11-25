const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Create headers with auth token
const createHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Generic API request function
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  // Debug logging for URL
  // console.log("API URL:", url);

  // Remove body from GET requests
  let config: RequestInit = {
    headers: createHeaders(),
    credentials: 'include', // أضف هذا السطر لحل مشكلة CORS
    ...options
  };
  if ((config.method === undefined || config.method === 'GET') && 'body' in config) {
    delete config.body;
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (username: string, password: string, companyCode: string) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, companyCode })
    });

    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }

    return response;
  },

  registerCompany: async (companyData: any) => {
    return await apiRequest('/auth/register-company', {
      method: 'POST',
      body: JSON.stringify(companyData)
    });
  },

  getProfile: async () => {
    return await apiRequest('/auth/profile');
  },

  updateProfile: async (profileData: any) => {
    return await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  verify: async () => {
    return await apiRequest('/auth/verify');
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  }
};

// Trucks API
export const trucksAPI = {
  getAll: async () => {
    return await apiRequest('/trucks');
  },

  getById: async (id: string) => {
    return await apiRequest(`/trucks/${id}`);
  },

  create: async (truckData: any) => {
    return await apiRequest('/trucks', {
      method: 'POST',
      body: JSON.stringify(truckData)
    });
  },

  update: async (id: string, truckData: any) => {
    return await apiRequest(`/trucks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(truckData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest(`/trucks/${id}`, {
      method: 'DELETE'
    });
  }
};

// Expenses API
export const expensesAPI = {
  getAll: async (filters?: any) => {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiRequest(`/expenses${queryParams ? `?${queryParams}` : ''}`);
  },

  create: async (expenseData: any) => {
    return await apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
  },

  update: async (id: string, expenseData: any) => {
    return await apiRequest(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest(`/expenses/${id}`, {
      method: 'DELETE'
    });
  }
};

// Maintenance API
export const maintenanceAPI = {
  getAll: async (filters?: any) => {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiRequest(`/maintenance${queryParams ? `?${queryParams}` : ''}`);
  },

  create: async (maintenanceData: any) => {
    return await apiRequest('/maintenance', {
      method: 'POST',
      body: JSON.stringify(maintenanceData)
    });
  },

  update: async (id: string, maintenanceData: any) => {
    return await apiRequest(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(maintenanceData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest(`/maintenance/${id}`, {
      method: 'DELETE'
    });
  }
};

// Trips API
export const tripsAPI = {
  getAll: async (filters?: any) => {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiRequest(`/trips${queryParams ? `?${queryParams}` : ''}`);
  },

  create: async (tripData: any) => {
    return await apiRequest('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData)
    });
  },

  update: async (id: string, tripData: any) => {
    return await apiRequest(`/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tripData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest(`/trips/${id}`, {
      method: 'DELETE'
    });
  },

  complete: async (id: string, actualEndDate?: string) => {
    return await apiRequest(`/trips/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ actualEndDate })
    });
  }
};

// Users API
export const usersAPI = {
  getAll: async () => {
    return await apiRequest('/users');
  },

  getById: async (id: string) => {
    return await apiRequest(`/users/${id}`);
  },

  create: async (userData: any) => {
    return await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  update: async (id: string, userData: any) => {
    return await apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest(`/users/${id}`, {
      method: 'DELETE'
    });
  }
};