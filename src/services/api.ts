import { Expense, MaintenanceRecord, Trip, Truck, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const REQUEST_TIMEOUT_MS = 15000;

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Create headers with auth token
const createHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/** فلاتر الاستعلام: القيم undefined و null والفارغة تُتجاهل عند بناء الـ query string */
export type ApiFilters = Record<string, string | number | boolean | undefined | null>;

export interface LoginResponse {
  token: string;
  user: User;
}

export interface VerifyResponse {
  valid: boolean;
  user?: User;
}

export interface RegisterCompanyPayload {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  adminUsername: string;
  adminPassword: string;
  adminName: string;
  adminEmail?: string;
}

export type ProfileUpdate = Partial<Pick<User, 'name' | 'email' | 'phone' | 'profileImage'>>;

export type CreateUserPayload = Omit<User, 'id'> & { password: string };

export type CreateTruckPayload = Omit<Truck, 'id'>;
export type CreateExpensePayload = Omit<Expense, 'id'>;
export type CreateMaintenancePayload = Omit<MaintenanceRecord, 'id'>;
export type CreateTripPayload = Omit<Trip, 'id'>;

const buildQueryString = (filters?: ApiFilters): string => {
  if (!filters) return '';
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

interface ApiErrorBody {
  error?: string;
  message?: string;
}

const clearSession = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('truck_system_user');
};

// Generic API request function
const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Remove body from GET requests
    const config: RequestInit = {
      headers: createHeaders(),
      credentials: 'include', // أضف هذا السطر لحل مشكلة CORS
      ...options,
      signal: controller.signal
    };
    if ((config.method === undefined || config.method === 'GET') && 'body' in config) {
      delete config.body;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // 204 No Content: لا يوجد جسم للقراءة
    if (response.status === 204) {
      return undefined as T;
    }

    // 401: انتهت الجلسة — مسح التوكن وإعادة التوجيه للدخول
    if (response.status === 401) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Network error' }))) as ApiErrorBody;
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('انتهت مهلة الطلب (15 ثانية)، يرجى المحاولة مجدداً');
    }
    console.error('API request failed:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Auth API
export const authAPI = {
  login: async (username: string, password: string, companyCode: string) => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, companyCode })
    });

    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }

    return response;
  },

  registerCompany: async (companyData: RegisterCompanyPayload) => {
    return await apiRequest<{ success?: boolean; message?: string }>('/auth/register-company', {
      method: 'POST',
      body: JSON.stringify(companyData)
    });
  },

  getProfile: async () => {
    return await apiRequest<User>('/auth/profile');
  },

  updateProfile: async (profileData: ProfileUpdate) => {
    return await apiRequest<{ user?: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  verify: async () => {
    return await apiRequest<VerifyResponse>('/auth/verify');
  },

  logout: () => {
    clearSession();
  }
};

// Trucks API
export const trucksAPI = {
  getAll: async () => {
    return await apiRequest<Truck[]>('/trucks');
  },

  getById: async (id: string) => {
    return await apiRequest<Truck>(`/trucks/${id}`);
  },

  create: async (truckData: CreateTruckPayload) => {
    return await apiRequest<Truck>('/trucks', {
      method: 'POST',
      body: JSON.stringify(truckData)
    });
  },

  update: async (id: string, truckData: Partial<Truck>) => {
    return await apiRequest<Truck>(`/trucks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(truckData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest<void>(`/trucks/${id}`, {
      method: 'DELETE'
    });
  }
};

// Expenses API
export const expensesAPI = {
  getAll: async (filters?: ApiFilters) => {
    return await apiRequest<Expense[]>(`/expenses${buildQueryString(filters)}`);
  },

  create: async (expenseData: CreateExpensePayload) => {
    return await apiRequest<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
  },

  update: async (id: string, expenseData: Partial<Expense>) => {
    return await apiRequest<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest<void>(`/expenses/${id}`, {
      method: 'DELETE'
    });
  }
};

// Maintenance API
export const maintenanceAPI = {
  getAll: async (filters?: ApiFilters) => {
    return await apiRequest<MaintenanceRecord[]>(`/maintenance${buildQueryString(filters)}`);
  },

  create: async (maintenanceData: CreateMaintenancePayload) => {
    return await apiRequest<MaintenanceRecord>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(maintenanceData)
    });
  },

  update: async (id: string, maintenanceData: Partial<MaintenanceRecord>) => {
    return await apiRequest<MaintenanceRecord>(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(maintenanceData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest<void>(`/maintenance/${id}`, {
      method: 'DELETE'
    });
  }
};

// Trips API
export const tripsAPI = {
  getAll: async (filters?: ApiFilters) => {
    return await apiRequest<Trip[]>(`/trips${buildQueryString(filters)}`);
  },

  create: async (tripData: CreateTripPayload) => {
    return await apiRequest<Trip>('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData)
    });
  },

  update: async (id: string, tripData: Partial<Trip>) => {
    return await apiRequest<Trip>(`/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tripData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest<void>(`/trips/${id}`, {
      method: 'DELETE'
    });
  },

  complete: async (id: string, actualEndDate?: string) => {
    return await apiRequest<Trip>(`/trips/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ actualEndDate })
    });
  }
};

// Users API
export const usersAPI = {
  getAll: async () => {
    return await apiRequest<User[]>('/users');
  },

  getById: async (id: string) => {
    return await apiRequest<User>(`/users/${id}`);
  },

  create: async (userData: CreateUserPayload) => {
    return await apiRequest<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  update: async (id: string, userData: Partial<User>) => {
    return await apiRequest<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  delete: async (id: string) => {
    return await apiRequest<void>(`/users/${id}`, {
      method: 'DELETE'
    });
  }
};
