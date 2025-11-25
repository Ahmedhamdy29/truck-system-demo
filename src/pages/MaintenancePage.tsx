import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { StatCard } from '../components/Cards/StatCard';
import { AddMaintenanceModal } from '../components/Modals/AddMaintenanceModal';
import { Wrench, Calendar, DollarSign, AlertTriangle, Plus, Filter, Search, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useData } from '../contexts/DataContext';
import { exportMaintenanceToExcel } from '../utils/exportUtils';
import { useTrucks } from '../hooks/useTrucks';
import { useMaintenance } from '../hooks/useMaintenance';

export function MaintenancePage() {
  const { maintenance } = useData();
  const { trucks } = useTrucks();
  const maintenanceHook = useMaintenance();
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [selectedTruck, setSelectedTruck] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Calculate statistics
  const totalMaintenance = maintenance.maintenanceRecords.length;
  const totalCost = maintenance.maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);
  const upcomingMaintenance = maintenance.maintenanceRecords.filter(record => 
    record.nextDue && new Date(record.nextDue) > new Date()
  ).length;
  const averageCost = totalMaintenance > 0 ? totalCost / totalMaintenance : 0;

  // Filter maintenance records
  const filteredRecords = maintenance.maintenanceRecords.filter(record => {
    const truck = trucks.find(t => t.id === record.truckId);
    const matchesSearch = truck?.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTruck = selectedTruck === 'all' || record.truckId === selectedTruck;
    const matchesType = selectedType === 'all' || record.type === selectedType;
    
    // فلترة حسب الفترة الزمنية
    const recordDate = new Date(record.date);
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

    const matchesDate = recordDate >= startDate && recordDate <= endDate;
    
    return matchesSearch && matchesTruck && matchesType && matchesDate;
  });

  // Maintenance type distribution for chart
  const typeDistribution = [
    { name: 'صيانة دورية', value: maintenance.maintenanceRecords.filter(r => r.type === 'periodic').length, color: '#3B82F6' },
    { name: 'فحص الإطارات', value: maintenance.maintenanceRecords.filter(r => r.type === 'tire-check').length, color: '#10B981' },
    { name: 'تغيير زيت', value: maintenance.maintenanceRecords.filter(r => r.type === 'oil-change').length, color: '#F59E0B' },
    { name: 'فحص شامل', value: maintenance.maintenanceRecords.filter(r => r.type === 'comprehensive').length, color: '#EF4444' },
  ];

  // Monthly maintenance cost data
  const monthlyData = [
    { month: 'يناير', cost: 0 },
    { month: 'فبراير', cost: 0 },
    { month: 'مارس', cost: 0 },
    { month: 'أبريل', cost: 0 },
    { month: 'مايو', cost: 0 },
    { month: 'يونيو', cost: 0 },
  ];

  const handleAddMaintenance = async (newMaintenance: any) => {
    try {
      await maintenance.addMaintenanceRecord(newMaintenance);
      setIsAddModalOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء إضافة الصيانة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleExportExcel = () => {
    exportMaintenanceToExcel(maintenance.maintenanceRecords, trucks);
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'periodic': return 'صيانة دورية';
      case 'tire-check': return 'فحص الإطارات';
      case 'oil-change': return 'تغيير زيت';
      case 'comprehensive': return 'فحص شامل';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'periodic': return 'bg-blue-100 text-blue-800';
      case 'tire-check': return 'bg-green-100 text-green-800';
      case 'oil-change': return 'bg-yellow-100 text-yellow-800';
      case 'comprehensive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout title="إدارة الصيانة">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">إدارة الصيانة</h2>
            <p className="mt-1 text-sm text-gray-600">متابعة وإدارة جميع عمليات الصيانة</p>
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
              <span>إضافة صيانة</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="إجمالي الصيانة"
            value={totalMaintenance}
            icon={Wrench}
            color="blue"
          />
          <StatCard
            title="إجمالي التكلفة"
            value={totalCost > 0 ? `${totalCost.toLocaleString()} ر.س` : '0 ر.س'}
            icon={DollarSign}
            color="purple"
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
                placeholder="البحث في الصيانة..."
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
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">جميع الأنواع</option>
                <option value="periodic">صيانة دورية</option>
                <option value="tire-check">فحص الإطارات</option>
                <option value="oil-change">تغيير زيت</option>
                <option value="comprehensive">فحص شامل</option>
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
        {(typeDistribution.some(item => item.value > 0) || monthlyData.some(item => item.cost > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Maintenance Type Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع أنواع الصيانة</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeDistribution.filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Maintenance Cost */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">تكلفة الصيانة الشهرية</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cost" fill="#3B82F6" name="التكلفة" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Records List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">سجلات الصيانة</h3>
          </div>
          <div className="p-6">
            {filteredRecords.length > 0 ? (
              <div className="space-y-4">
                {filteredRecords.map((record) => {
                  const truck = trucks.find(t => t.id === record.truckId);
                  return (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Wrench className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{truck?.number || 'شاحنة غير معروفة'}</h4>
                            <p className="text-sm text-gray-600">{record.description}</p>
                            <div className="flex items-center space-x-4 rtl:space-x-reverse mt-1">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                                {getTypeText(record.type)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(record.date).toLocaleDateString('ar')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left rtl:text-right flex flex-col items-end gap-2">
                          <p className="font-bold text-gray-900">{record.cost.toLocaleString()} ر.س</p>
                          {record.nextDue && (
                            <p className="text-sm text-gray-500">
                              القادم: {new Date(record.nextDue).toLocaleDateString('ar')}
                            </p>
                          )}
                          <button
                            className="text-red-600 hover:text-red-800 px-2 py-1 rounded transition-colors border border-red-200 bg-red-50 text-xs"
                            onClick={async () => {
                              if(window.confirm('هل أنت متأكد من حذف سجل الصيانة؟')) {
                                await maintenanceHook.deleteMaintenanceRecord(record.id);
                              }
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                  <Wrench className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد سجلات صيانة</h3>
                <p className="text-gray-500 mb-6">ابدأ بإضافة أول سجل صيانة لأسطولك</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  إضافة صيانة جديدة
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddMaintenanceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMaintenance}
        selectedTruckId={selectedTruck === 'all' ? undefined : selectedTruck}
      />
    </Layout>
  );
} 