import { useState, useEffect, useCallback } from 'react';
import { Expense } from '../types';
import { expensesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchExpenses = useCallback(async (filters?: any) => {
    // Check if user is authenticated before making API call
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await expensesAPI.getAll(filters);
      setExpenses(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated) {
      fetchExpenses();
    } else {
      setLoading(false);
      setExpenses([]);
    }
  }, [fetchExpenses, isAuthenticated]);

  const addExpense = useCallback(async (newExpense: Omit<Expense, 'id'>) => {
    try {
      const expense = await expensesAPI.create(newExpense);
      setExpenses(prev => [expense, ...prev]);
      return expense;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
      throw err;
    }
  }, []);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    try {
      await expensesAPI.update(id, updates);
      await fetchExpenses(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
      throw err;
    }
  }, [fetchExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await expensesAPI.delete(id);
      setExpenses(prev => prev.filter(expense => expense.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
      throw err;
    }
  }, []);

  const getExpensesByTruck = useCallback((truckId: string) => {
    return expenses.filter(expense => expense.truckId === truckId);
  }, [expenses]);

  const getTotalExpensesByTruck = useCallback((truckId: string) => {
    return expenses
      .filter(expense => expense.truckId === truckId)
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByTruck,
    getTotalExpensesByTruck,
    refetch: fetchExpenses
  };
}