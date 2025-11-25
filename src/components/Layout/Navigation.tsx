import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Truck, Receipt, Settings, Wrench, Route, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Navigation() {
  const { user } = useAuth();

  if (user?.role === 'driver') {
    // السائق يرى فقط شاحنته
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 rtl:space-x-reverse">
            <NavLink
              to={`/trucks/${user.truckId}`}
              className={({ isActive }) =>
                `flex items-center space-x-2 rtl:space-x-reverse px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              <Truck className="h-4 w-4" />
              <span>شاحنتي</span>
            </NavLink>
          </div>
        </div>
      </nav>
    );
  }

  const navItems = [
    { to: '/', icon: BarChart3, label: 'لوحة التحكم', adminOnly: false },
    { to: '/trucks', icon: Truck, label: 'الشاحنات', adminOnly: false },
    { to: '/trips', icon: Route, label: 'الرحلات', adminOnly: false },
    { to: '/maintenance', icon: Wrench, label: 'الصيانة', adminOnly: false },
    { to: '/expenses', icon: Receipt, label: 'تقارير المصاريف', adminOnly: false },
    { to: '/reports', icon: FileText, label: 'التقارير', adminOnly: true },
    { to: '/settings', icon: Settings, label: 'الإعدادات', adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 rtl:space-x-reverse">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-2 rtl:space-x-reverse px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}