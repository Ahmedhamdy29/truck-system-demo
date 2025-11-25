import React from 'react';
import { Truck as TruckIcon, MapPin, Calendar, Wrench, DollarSign } from 'lucide-react';
import { Truck } from '../../types';
import { Link } from 'react-router-dom';
import { useExpenses } from '../../hooks/useExpenses';

interface TruckCardProps {
  truck: Truck;
}

export function TruckCard({ truck }: TruckCardProps) {
  const { getExpensesByTruck, getTotalExpensesByTruck } = useExpenses();
  const truckExpenses = getExpensesByTruck(truck.id);
  const totalExpenses = getTotalExpensesByTruck(truck.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-trip': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'متاحة';
      case 'in-trip': return 'في رحلة';
      case 'maintenance': return 'صيانة';
      default: return 'غير محدد';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-blue-100 p-2 rounded-lg">
              <TruckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{truck.number}</h3>
              <p className="text-sm text-gray-500">{truck.model} - {truck.year}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(truck.status)}`}>
            {getStatusText(truck.status)}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-600">
            <span className="font-medium">رقم اللوحة:</span>
            <span>{truck.plateNumber}</span>
          </div>
          {/* اسم السائق */}
          {truck.driverName && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-blue-700">
              <span className="font-medium">السائق:</span>
              <span>{truck.driverName}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-600">
            <span className="font-medium">الحمولة:</span>
            <span>{truck.loadCapacity} طن</span>
          </div>

          {truck.currentTrip && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {truck.currentTrip.destination} - {truck.currentTrip.direction === 'outbound' ? 'ذهاب' : 'عودة'}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${truck.currentTrip.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-700">تقدم الرحلة: {truck.currentTrip.progress}%</p>
            </div>
          )}

          {truck.nextMaintenance && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>الصيانة القادمة: {new Date(truck.nextMaintenance).toLocaleDateString('ar')}</span>
            </div>
          )}

          {/* إجمالي المصاريف */}
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">إجمالي المصاريف:</span>
              </div>
              <span className="text-lg font-bold text-purple-900">
                {totalExpenses.toLocaleString()} ر.س
              </span>
            </div>
            <div className="mt-1 text-xs text-purple-700">
              عدد المصاريف: {truckExpenses.length}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <Link
            to={`/trucks/${truck.id}`}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-block text-center"
          >
            عرض التفاصيل
          </Link>
        </div>
      </div>
    </div>
  );
}