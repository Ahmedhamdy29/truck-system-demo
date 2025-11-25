import { useState, useEffect, useCallback } from 'react';
import { Truck } from '../types';
import { trucksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function useTrucks() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchTrucks = useCallback(async () => {
    // Check if user is authenticated before making API call
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await trucksAPI.getAll();
      setTrucks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trucks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated) {
      fetchTrucks();
    } else {
      setLoading(false);
      setTrucks([]);
    }
  }, [fetchTrucks, isAuthenticated]);

  const addTruck = useCallback(async (newTruck: Omit<Truck, 'id'>) => {
    try {
      const truck = await trucksAPI.create(newTruck);
      setTrucks(prev => [...prev, truck]);
      return truck;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add truck');
      throw err;
    }
  }, []);

  const updateTruck = useCallback(async (id: string, updates: Partial<Truck>) => {
    try {
      await trucksAPI.update(id, updates);
      await fetchTrucks(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update truck');
      throw err;
    }
  }, [fetchTrucks]);

  const deleteTruck = useCallback(async (id: string) => {
    try {
      await trucksAPI.delete(id);
      setTrucks(prev => prev.filter(truck => truck.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete truck');
      throw err;
    }
  }, []);

  return {
    trucks,
    loading,
    error,
    addTruck,
    updateTruck,
    deleteTruck,
    refetch: fetchTrucks
  };
}