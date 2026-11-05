import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { usersAPI, CreateUserPayload } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchUsers = useCallback(async () => {
    // Check if user is authenticated before making API call
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await usersAPI.getAll();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated) {
      fetchUsers();
    } else {
      setLoading(false);
      setUsers([]);
    }
  }, [fetchUsers, isAuthenticated]);

  const addUser = useCallback(async (newUser: CreateUserPayload) => {
    try {
      const user = await usersAPI.create(newUser);
      setUsers(prev => [...prev, user]);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
      throw err;
    }
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    try {
      await usersAPI.update(id, updates);
      await fetchUsers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      throw err;
    }
  }, [fetchUsers]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await usersAPI.delete(id);
      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      throw err;
    }
  }, []);

  return {
    users,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers
  };
}
