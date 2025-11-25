import React, { useState } from 'react';
import { LogOut, User, Settings, Truck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileModal } from '../Modals/ProfileModal';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Title Section */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                  <p className="text-sm text-gray-500">نظام إدارة الشاحنات</p>
                </div>
              </div>
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-3 rtl:space-x-reverse text-sm">
                <div className="text-right rtl:text-left">
                  <p className="font-medium text-gray-900">{user?.name}</p>
                  <p className="text-gray-500">
                    {user?.role === 'admin' ? 'مدير النظام' : 'سائق'}
                  </p>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="relative group"
                >
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                    />
                  ) : (
                    <div className="bg-gray-100 p-2 rounded-full group-hover:bg-blue-100 transition-colors">
                      <User className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
                    </div>
                  )}
                </button>
              </div>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <button
                onClick={logout}
                className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}