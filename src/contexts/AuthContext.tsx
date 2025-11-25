import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { defaultAdmin } from '../data/mockData';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, companyCode: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// كلمة المرور الافتراضية
// const defaultPassword = 'admin123';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await authAPI.verify();
          if (response.valid && response.user) {
            setUser(response.user);
            // Update stored user data just in case
            localStorage.setItem('truck_system_user', JSON.stringify(response.user));
          } else {
            throw new Error('Invalid token');
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string, companyCode: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(username, password, companyCode);
      if (response.token && response.user) {
        setUser(response.user);
        localStorage.setItem('truck_system_user', JSON.stringify(response.user));
        localStorage.setItem('auth_token', response.token);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error) {
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('truck_system_user');
    localStorage.removeItem('auth_token');
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('truck_system_user', JSON.stringify(updatedUser));
      localStorage.setItem('admin_profile', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      updateProfile,
      isLoading,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}