import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { TruckCard } from '../components/Trucks/TruckCard';
import { AddTruckModal } from '../components/Modals/AddTruckModal';
import { AddTripModal } from '../components/Modals/AddTripModal';
import { useTrucks } from '../hooks/useTrucks';
import { useData } from '../contexts/DataContext';
import { exportTrucksToExcel } from '../utils/exportUtils';
import { Search, Filter, Plus, Route, FileSpreadsheet, Truck } from 'lucide-react';

export function TrucksPage() {
  const { trucks, loading, error, addTruck } = useTrucks();
  const { trips } = useData();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [isTruckModalOpen, setIsTruckModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);

  const filteredTrucks = trucks.filter(truck => {
    const matchesSearch = truck.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         truck.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || truck.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddTruck = async (newTruck: any) => {
    try {
      await addTruck(newTruck);
      setIsTruckModalOpen(false);
    } catch (error) {
      console.error('Failed to add truck:', error);
      alert('فشل في إضافة الشاحنة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleAddTrip = (newTrip: any) => {
    trips.addTrip(newTrip);
  };

  const handleExportExcel = () => {
    exportTrucksToExcel(filteredTrucks);
  };

  if (loading) {
    return (
      <Layout title="إدارة الشاحنات">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="mr-3 text-gray-600">جاري تحميل البيانات...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="إدارة الشاحنات">
        <div className="text-center py-12">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
            <Truck className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="إدارة الشاحنات">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">قائمة الشاحنات</h2>
            <p className="mt-1 text-sm text-gray-600">إدارة ومتابعة جميع شاحنات الأسطول</p>
          </div>
          <div className="flex space-x-3 rtl:space-x-reverse mt-4 sm:mt-0">
            <button 
              onClick={handleExportExcel}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>تصدير Excel</span>
            </button>
            <button 
              onClick={() => setIsTruckModalOpen(true)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة شاحنة</span>
            </button>
            <button 
              onClick={() => setIsTripModalOpen(true)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Route className="h-4 w-4" />
              <span>إضافة رحلة جديدة</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="البحث برقم الشاحنة أو الموديل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="available">متاحة</option>
                <option value="in-trip">في رحلة</option>
                <option value="maintenance">صيانة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{trucks.length}</p>
              <p className="text-sm text-gray-600">إجمالي الشاحنات</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {trucks.filter(t => t.status === 'available').length}
              </p>
              <p className="text-sm text-gray-600">متاحة</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {trucks.filter(t => t.status === 'in-trip').length}
              </p>
              <p className="text-sm text-gray-600">في رحلة</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {trucks.filter(t => t.status === 'maintenance').length}
              </p>
              <p className="text-sm text-gray-600">صيانة</p>
            </div>
          </div>
        </div>

        {/* Trucks Grid or Empty State */}
        {filteredTrucks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrucks.map((truck) => (
              <TruckCard key={truck.id} truck={truck} />
            ))}
          </div>
        ) : trucks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد شاحنات مسجلة</h3>
            <p className="text-gray-500 mb-6">ابدأ بإضافة أول شاحنة لأسطولك</p>
            <button 
              onClick={() => setIsTruckModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              إضافة شاحنة جديدة
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد شاحنات تطابق معايير البحث</p>
          </div>
        )}
      </div>

      <AddTruckModal
        isOpen={isTruckModalOpen}
        onClose={() => setIsTruckModalOpen(false)}
        onAdd={handleAddTruck}
      />

      <AddTripModal
        isOpen={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        onAdd={handleAddTrip}
      />
    </Layout>
  );
}