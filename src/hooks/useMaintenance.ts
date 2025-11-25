import { useState, useEffect, useCallback } from 'react';
import { MaintenanceRecord } from '../types';
import { maintenanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function useMaintenance() {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchMaintenance = useCallback(async (filters?: any) => {
    // Check if user is authenticated before making API call
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await maintenanceAPI.getAll(filters);
      setMaintenanceRecords(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch maintenance records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated) {
      fetchMaintenance();
    } else {
      setLoading(false);
      setMaintenanceRecords([]);
    }
  }, [fetchMaintenance, isAuthenticated]);

  const addMaintenanceRecord = useCallback(async (newRecord: Omit<MaintenanceRecord, 'id'>) => {
    try {
      const record = await maintenanceAPI.create(newRecord);
      setMaintenanceRecords(prev => [record, ...prev]);
      return record;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add maintenance record');
      throw err;
    }
  }, []);

  const updateMaintenanceRecord = useCallback(async (id: string, updates: Partial<MaintenanceRecord>) => {
    try {
      await maintenanceAPI.update(id, updates);
      await fetchMaintenance(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update maintenance record');
      throw err;
    }
  }, [fetchMaintenance]);

  const deleteMaintenanceRecord = useCallback(async (id: string) => {
    try {
      await maintenanceAPI.delete(id);
      setMaintenanceRecords(prev => prev.filter(record => record.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete maintenance record');
      throw err;
    }
  }, []);

  const getMaintenanceByTruck = useCallback((truckId: string) => {
    return maintenanceRecords.filter(record => record.truckId === truckId);
  }, [maintenanceRecords]);

  const getTotalMaintenanceCostByTruck = useCallback((truckId: string) => {
    return maintenanceRecords
      .filter(record => record.truckId === truckId)
      .reduce((sum, record) => sum + record.cost, 0);
  }, [maintenanceRecords]);

  return {
    maintenanceRecords,
    loading,
    error,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    getMaintenanceByTruck,
    getTotalMaintenanceCostByTruck,
    refetch: fetchMaintenance
  };
}