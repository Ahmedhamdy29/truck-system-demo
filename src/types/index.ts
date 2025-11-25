export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'driver';
  email?: string;
  phone?: string;
  profileImage?: string | null;
  truckId?: string;
}

export interface Truck {
  id: string;
  number: string;
  model: string;
  year: number;
  plateNumber: string;
  engineNumber: string;
  chassisNumber: string;
  loadCapacity: number;
  status: 'available' | 'in-trip' | 'maintenance';
  currentTrip?: Trip;
  lastMaintenance?: string;
  nextMaintenance?: string;
  driverName?: string;
}

export interface Trip {
  id: string;
  truckId: string;
  destination: string;
  direction: 'outbound' | 'return';
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  status: 'active' | 'completed' | 'delayed';
  progress: number;
  delayReason?: string;
  revenue?: number | null;
}

export interface Expense {
  id: string;
  truckId: string;
  type: 'fuel' | 'maintenance' | 'fees' | 'other';
  amount: number;
  currency: 'SAR'; // ريال سعودي فقط
  date: string;
  description: string;
  category: string;
  receiptImage?: string | null;
}

export interface MaintenanceRecord {
  id: string;
  truckId: string;
  type: 'periodic' | 'tire-check' | 'oil-change' | 'comprehensive';
  date: string;
  cost: number;
  description: string;
  nextDue?: string;
}