import { useState, useEffect, useCallback } from 'react';
import { Trip } from '../types';
import { tripsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchTrips = useCallback(async (filters?: any) => {
    // Check if user is authenticated before making API call
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await tripsAPI.getAll(filters);
      setTrips(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated) {
      fetchTrips();
    } else {
      setLoading(false);
      setTrips([]);
    }
  }, [fetchTrips, isAuthenticated]);

  const addTrip = useCallback(async (newTrip: Omit<Trip, 'id'>) => {
    try {
      const trip = await tripsAPI.create(newTrip);
      setTrips(prev => [trip, ...prev]);
      return trip;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add trip');
      throw err;
    }
  }, []);

  const updateTrip = useCallback(async (id: string, updates: Partial<Trip>) => {
    try {
      await tripsAPI.update(id, updates);
      await fetchTrips(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trip');
      throw err;
    }
  }, [fetchTrips]);

  const completeTrip = useCallback(async (id: string) => {
    try {
      await tripsAPI.complete(id);
      await fetchTrips(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete trip');
      throw err;
    }
  }, [fetchTrips]);

  const deleteTrip = useCallback(async (id: string) => {
    try {
      await tripsAPI.delete(id);
      setTrips(prev => prev.filter(trip => trip.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip');
      throw err;
    }
  }, []);

  const getTripsByTruck = useCallback((truckId: string) => {
    return trips.filter(trip => trip.truckId === truckId);
  }, [trips]);

  return {
    trips,
    loading,
    error,
    addTrip,
    updateTrip,
    completeTrip,
    deleteTrip,
    getTripsByTruck,
    refetch: fetchTrips
  };
}