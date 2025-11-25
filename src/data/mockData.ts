import { Truck, Expense, MaintenanceRecord, User } from '../types';

// المستخدم الافتراضي للمدير
export const defaultAdmin: User = {
  id: '1',
  username: 'admin',
  name: 'المدير العام',
  role: 'admin',
  email: 'admin@company.com',
  phone: '',
  profileImage: null
};

// بيانات المستخدمين الوهمية
export const mockUsers: User[] = [
  defaultAdmin,
  {
    id: '2',
    username: 'driver1',
    name: 'أحمد محمد',
    role: 'driver',
    email: 'ahmed@company.com',
    phone: '+966501234567',
    profileImage: null
  },
  {
    id: '3',
    username: 'driver2',
    name: 'محمد علي',
    role: 'driver',
    email: 'mohammed@company.com',
    phone: '+966507654321',
    profileImage: null
  },
  {
    id: '4',
    username: 'driver3',
    name: 'عبدالله سالم',
    role: 'driver',
    email: 'abdullah@company.com',
    phone: '+966509876543',
    profileImage: null
  }
];

// بيانات فارغة للإنتاج
export const mockTrucks: Truck[] = [];

export const mockExpenses: Expense[] = [];

export const mockMaintenanceRecords: MaintenanceRecord[] = [];