import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { StatCard } from '../components/Cards/StatCard';
import { AddTripModal } from '../components/Modals/AddTripModal';
import { Route, Calendar, MapPin, Clock, Plus, Filter, Search, FileSpreadsheet, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useData } from '../contexts/DataContext';
import { exportTripsToExcel } from '../utils/exportUtils';
import { useTrucks } from '../hooks/useTrucks';
import { useAuth } from '../contexts/AuthContext';

export function TripsPage() {
  const { trips } = useData();
  const { trucks } = useTrucks();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [selectedTruck, setSelectedTruck] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Calculate statistics
  const totalTrips = trips.trips.length;
  const activeTrips = trips.trips.filter(trip => trip.status === 'active').length;
  const completedTrips = trips.trips.filter(trip => trip.status === 'completed').length;
  const delayedTrips = trips.trips.filter(trip => trip.status === 'delayed').length;

  // فلترة الرحلات للسائق فقط
  const filteredTrips = trips.trips.filter(trip => {
    if (user?.role === 'driver') {
      return trip.truckId === user.truckId;
    }
    const truck = trucks.find(t => t.id === trip.truckId);
    const matchesSearch = truck?.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTruck = selectedTruck === 'all' || trip.truckId === selectedTruck;
    const matchesStatus = selectedStatus === 'all' || trip.status === selectedStatus;
    
    // فلترة حسب الفترة الزمنية
    const tripDate = new Date(trip.startDate);
    const now = new Date();
    let startDate = new Date(0);
    let endDate = new Date();

    switch (selectedPeriod) {
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-3-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'this-year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(0);
        endDate = new Date();
    }

    const matchesDate = tripDate >= startDate && tripDate <= endDate;
    
    return matchesSearch && matchesTruck && matchesStatus && matchesDate;
  });

  // Trip status distribution for chart
  const statusDistribution = [
    { name: 'نشطة', value: activeTrips, color: '#3B82F6' },
    { name: 'مكتملة', value: completedTrips, color: '#10B981' },
    { name: 'متأخرة', value: delayedTrips, color: '#F59E0B' },
  ];

  // Monthly trips data
  const monthlyData = [
    { month: 'يناير', trips: 0 },
    { month: 'فبراير', trips: 0 },
    { month: 'مارس', trips: 0 },
    { month: 'أبريل', trips: 0 },
    { month: 'مايو', trips: 0 },
    { month: 'يونيو', trips: 0 },
  ];

  const handleAddTrip = (newTrip: any) => {
    trips.addTrip(newTrip);
    setIsAddModalOpen(false);
  };

  const handleExportExcel = () => {
    exportTripsToExcel(trips.trips, trucks);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشطة';
      case 'completed': return 'مكتملة';
      case 'delayed': return 'متأخرة';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'delayed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return PlayCircle;
      case 'completed': return CheckCircle;
      case 'delayed': return AlertCircle;
      default: return Clock;
    }
  };

  const getDirectionText = (direction: string) => {
    switch (direction) {
      case 'outbound': return 'ذهاب';
      case 'return': return 'عودة';
      default: return direction;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'outbound': return 'bg-purple-100 text-purple-800';
      case 'return': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (trip: any) => {
    if (trip.status === 'completed') return 100;
    if (trip.status === 'delayed') return trip.progress || 0;
    
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.expectedEndDate);
    const currentDate = new Date();
    
    if (currentDate < startDate) return 0;
    if (currentDate > endDate) return 100;
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = currentDate.getTime() - startDate.getTime();
    return Math.round((elapsed / totalDuration) * 100);
  };

  return (
    <Layout title="إدارة الرحلات">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">إدارة الرحلات</h2>
            <p className="mt-1 text-sm text-gray-600">متابعة وإدارة جميع رحلات الشاحنات</p>
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
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة رحلة</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="إجمالي الرحلات"
            value={totalTrips}
            icon={Route}
            color="blue"
          />
          <StatCard
            title="الرحلات النشطة"
            value={activeTrips}
            icon={PlayCircle}
            color="green"
          />
          <StatCard
            title="الرحلات المكتملة"
            value={completedTrips}
            icon={CheckCircle}
            color="purple"
          />
          <StatCard
            title="الرحلات المتأخرة"
            value={delayedTrips}
            icon={AlertCircle}
            color="yellow"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="البحث في الرحلات..."
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
                value={selectedTruck}
                onChange={(e) => setSelectedTruck(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">جميع الشاحنات</option>
                {trucks.map(truck => (
                  <option key={truck.id} value={truck.id}>{truck.number}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشطة</option>
                <option value="completed">مكتملة</option>
                <option value="delayed">متأخرة</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="this-month">هذا الشهر</option>
                <option value="last-month">الشهر الماضي</option>
                <option value="last-3-months">آخر 3 أشهر</option>
                <option value="this-year">هذا العام</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charts */}
        {(statusDistribution.some(item => item.value > 0) || monthlyData.some(item => item.trips > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trip Status Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع حالات الرحلات</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution.filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Trips */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">الرحلات الشهرية</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="trips" fill="#3B82F6" name="الرحلات" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Trips List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">قائمة الرحلات</h3>
          </div>
          <div className="p-6">
            {filteredTrips.length > 0 ? (
              <div className="space-y-4">
                {filteredTrips.map((trip) => {
                  const truck = trucks.find(t => t.id === trip.truckId);
                  const StatusIcon = getStatusIcon(trip.status);
                  const progress = calculateProgress(trip);
                  
                  return (
                    <div key={trip.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Route className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                              <h4 className="font-medium text-gray-900">{truck?.number || 'شاحنة غير معروفة'}</h4>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                                {getStatusText(trip.status)}
                              </span>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getDirectionColor(trip.direction)}`}>
                                {getDirectionText(trip.direction)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                <MapPin className="h-4 w-4" />
                                <span>{trip.destination}</span>
                              </div>
                              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(trip.startDate).toLocaleDateString('ar')}</span>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            {trip.status === 'active' && (
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-left rtl:text-right">
                          <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                            <StatusIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-500">
                              {trip.status === 'active' ? `${progress}%` : getStatusText(trip.status)}
                            </span>
                          </div>
                          {trip.actualEndDate && (
                            <p className="text-sm text-gray-500">
                              انتهت: {new Date(trip.actualEndDate).toLocaleDateString('ar')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                  <Route className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد رحلات</h3>
                <p className="text-gray-500 mb-6">ابدأ بإضافة أول رحلة لأسطولك</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  إضافة رحلة جديدة
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddTripModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTrip}
        selectedTruckId={selectedTruck === 'all' ? undefined : selectedTruck}
      />
    </Layout>
  );
} 