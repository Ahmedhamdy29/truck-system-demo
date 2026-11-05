import { createContext, useContext, type ReactNode } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useTrips } from '../hooks/useTrips';
import { useMaintenance } from '../hooks/useMaintenance';
import { useTrucks } from '../hooks/useTrucks';
import { useUsers } from '../hooks/useUsers';

// DataContext هو المصدر الوحيد للبيانات في الواجهة: كل صفحة/مكوّن يقرأ من هنا
// ولا يستدعي أي Hook من hooks/* مباشرة، حتى لا يتكرر نفس الـ GET في نفس الصفحة.
interface DataContextType {
  trucks: ReturnType<typeof useTrucks>;
  expenses: ReturnType<typeof useExpenses>;
  trips: ReturnType<typeof useTrips>;
  maintenance: ReturnType<typeof useMaintenance>;
  users: ReturnType<typeof useUsers>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const trucks = useTrucks();
  const expenses = useExpenses();
  const trips = useTrips();
  const maintenance = useMaintenance();
  const users = useUsers();

  return (
    <DataContext.Provider value={{ trucks, expenses, trips, maintenance, users }}>
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
