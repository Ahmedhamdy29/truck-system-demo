import React, { createContext, useContext, ReactNode } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useTrips } from '../hooks/useTrips';
import { useMaintenance } from '../hooks/useMaintenance';

interface DataContextType {
  expenses: ReturnType<typeof useExpenses>;
  trips: ReturnType<typeof useTrips>;
  maintenance: ReturnType<typeof useMaintenance>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const expenses = useExpenses();
  const trips = useTrips();
  const maintenance = useMaintenance();

  return (
    <DataContext.Provider value={{ expenses, trips, maintenance }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}