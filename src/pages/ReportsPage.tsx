import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { StatCard } from '../components/Cards/StatCard';
import { 
  FileText, 
  TrendingUp, 
  Fuel, 
  Users, 
  Calendar, 
  DollarSign, 
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { useData } from '../contexts/DataContext';
import { useTrucks } from '../hooks/useTrucks';
import { useAuth } from '../contexts/AuthContext';
import { 
  exportPerformanceReport, 
  exportProfitabilityReport, // Keep this import
  exportFuelReport, 
  exportDriverReport 
} from '../utils/exportUtils';

export function ReportsPage() {
  const { expenses, maintenance, trips } = useData();
  const { trucks } = useTrucks();
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState('performance');
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [selectedTruck, setSelectedTruck] = useState('all');

  function normalizeDate(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  // فلترة البيانات حسب الفترة والشاحنة
  const getFilteredData = () => {
    const now = new Date();
    let startDate = new Date(0);
    let endDate = new Date();

    // تحديد الفترة الزمنية
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

    startDate = normalizeDate(startDate);
    endDate = normalizeDate(endDate);

    // فلترة المصروفات
    const filteredExpenses = expenses.expenses.filter(e => {
      const expenseDate = normalizeDate(new Date(e.date));
      const matchesTruck = selectedTruck === 'all' || e.truckId === selectedTruck;
      return expenseDate >= startDate && expenseDate <= endDate && matchesTruck;
    });

    // فلترة سجلات الصيانة
    const filteredMaintenance = maintenance.maintenanceRecords.filter(m => {
      const maintenanceDate = normalizeDate(new Date(m.date));
      const matchesTruck = selectedTruck === 'all' || m.truckId === selectedTruck;
      return maintenanceDate >= startDate && maintenanceDate <= endDate && matchesTruck;
    });

    // فلترة الرحلات
    const filteredTrips = trips.trips.filter(t => {
      const tripDate = normalizeDate(new Date(t.startDate));
      const matchesTruck = selectedTruck === 'all' || t.truckId === selectedTruck;
      return tripDate >= startDate && tripDate <= endDate && matchesTruck;
    });

    return {
      expenses: filteredExpenses,
      maintenance: filteredMaintenance,
      trips: filteredTrips
    };
  };

  const filteredData = getFilteredData();

  // إحصائيات عامة
  const calculateAmount = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const totalExpenses = filteredData.expenses
    .reduce((sum, e) => sum + calculateAmount(e.amount), 0);
  // مشكلة: يمكن استخدام parseFloat بدل Number للتعامل مع الكسور العشرية

  const totalMaintenanceCost = filteredData.maintenance
    .reduce((sum, m) => sum + calculateAmount(m.cost), 0);

  const totalTrips = filteredData.trips.length;
  const completedTrips = filteredData.trips.filter(t => t.status === 'completed').length;
  const activeTrucks = trucks.filter(t => t.status === 'in-trip').length;

  // حساب الأداء الشهري ديناميكيًا
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthlyPerformanceData = months.map((month, i) => {
    const monthExpenses = filteredData.expenses
        .filter(e => new Date(e.date).getMonth() === i && 
                     new Date(e.date).getFullYear() === new Date().getFullYear())
        .reduce((sum, e) => sum + calculateAmount(e.amount), 0);
    const monthMaintenance = filteredData.maintenance.filter(m => new Date(m.date).getMonth() === i).reduce((sum, m) => sum + m.cost, 0);
    const monthTrips = filteredData.trips.filter(t => new Date(t.startDate).getMonth() === i).length;
    return { month, expenses: monthExpenses, maintenance: monthMaintenance, trips: monthTrips };
  });

  // تقرير ربحية الشاحنات منفصل حسب العملة
  const truckProfitability = trucks.map(truck => {
    // فلترة المصروفات الخاصة بالشاحنة والفترة المختارة
    const truckExpenses = filteredData.expenses.filter(e => e.truckId === truck.id && typeof e.amount === 'number');
    const truckMaintenance = filteredData.maintenance.filter(m => m.truckId === truck.id && typeof m.cost === 'number');
    const truckTrips = filteredData.trips.filter(t => t.truckId === truck.id);
    
    const totalCost = truckExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalMaintenance = truckMaintenance.reduce((sum, m) => sum + m.cost, 0);
    const totalGeneralCost = totalCost + totalMaintenance;
    const tripCount = truckTrips.length;
    const avgCostPerTrip = tripCount > 0 ? totalGeneralCost / tripCount : 0;
    // إجمالي الإيرادات
    const totalRevenue = truckTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
    // الربح بناءً على التكلفة العامة
    const profit = totalRevenue - totalGeneralCost;
    return {
      truck: truck.number,
      totalCost,
      totalMaintenance,
      totalGeneralCost,
      tripCount,
      avgCostPerTrip,
      totalRevenue,
      profit,
      status: truck.status
    };
  });

  // تقرير استهلاك الوقود منفصل حسب العملة
  const fuelConsumption = filteredData.expenses
    .filter(e => e.type === 'fuel' && typeof e.amount === 'number')
    .reduce((acc, expense) => {
      const truck = trucks.find(t => t.id === expense.truckId);
      const truckNumber = truck?.number || 'غير محدد';
      if (!acc[truckNumber]) {
        acc[truckNumber] = { truck: truckNumber, amount: 0, count: 0 };
      }
      acc[truckNumber].amount += expense.amount;
      acc[truckNumber].count += 1;
      return acc;
    }, {} as Record<string, { truck: string; amount: number; count: number }>);

  const fuelData = Object.values(fuelConsumption).map(item => ({
    ...item,
    avgCost: item.count > 0 ? item.amount / item.count : 0
  }));

  // تقرير كفاءة السائقين (إذا كان هناك بيانات سائقين)
  const driverEfficiency = trucks
    .filter(truck => truck.driverName)
    .map(truck => {
      const truckTrips = filteredData.trips.filter(t => t.truckId === truck.id);
      const completedTrips = truckTrips.filter(t => t.status === 'completed').length;
      const efficiency = truckTrips.length > 0 ? (completedTrips / truckTrips.length) * 100 : 0;
      
      return {
        driver: truck.driverName || 'غير محدد',
        totalTrips: truckTrips.length,
        completedTrips,
        efficiency: Math.round(efficiency)
      };
    });

  // تصدير التقارير
  const handleExportReport = async () => {
    try {
      switch (selectedReport) {
        case 'performance':
          await exportPerformanceReport({
            totalExpenses: calculateAmount(totalExpenses),
            totalMaintenanceCost: calculateAmount(totalMaintenanceCost),
            totalTrips,
            completionRate: totalTrips > 0 ? 
              Math.round((completedTrips / totalTrips) * 100) : 0
          });
          break;
        case 'profitability':
          exportProfitabilityReport(truckProfitability);
          break;
        case 'fuel':
          exportFuelReport(fuelData);
          break;
        case 'drivers':
          exportDriverReport(driverEfficiency);
          break;
        default:
          // console.log('تقرير غير محدد');
      }
      // إضافة رسالة نجاح
    } catch (error) {
      console.error('خطأ في تصدير التقرير:', error);
      // إضافة رسالة خطأ
    }
  };

  const renderPerformanceReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="المصاريف بالريال"
          value={`${totalExpenses.toLocaleString()} ر.س`}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="إجمالي الرحلات"
          value={totalTrips}
          icon={Calendar}
          color="green"
        />
        <StatCard
          title="نسبة الإنجاز"
          value={`${totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0}%`}
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      {/* 
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الأداء الشهري</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="expenses" fill="#8B5CF6" name="المصاريف" />
                <Bar dataKey="maintenance" fill="#EF4444" name="الصيانة" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع المصاريف</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={[
                    { name: 'مصاريف عامة', value: totalExpenses - totalMaintenanceCost, color: '#3B82F6' },
                    { name: 'صيانة', value: totalMaintenanceCost, color: '#EF4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { name: 'مصاريف عامة', value: totalExpenses - totalMaintenanceCost, color: '#3B82F6' },
                    { name: 'صيانة', value: totalMaintenanceCost, color: '#EF4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      */}
    </div>
  );

  const renderProfitabilityReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ربحية الشاحنات</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشاحنة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجمالي الإيرادات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجمالي المصروفات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجمالي الصيانة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اجمالي تكلفه عامه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الربح</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عدد الرحلات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {truckProfitability.map((truck) => (
                <tr key={truck.truck} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{truck.truck}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-bold">{truck.totalRevenue.toLocaleString()} ر.س</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{truck.totalCost.toLocaleString()} ر.س</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900">{truck.totalMaintenance.toLocaleString()} ر.س</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-900 font-bold">{truck.totalGeneralCost.toLocaleString()} ر.س</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${truck.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{truck.profit.toLocaleString()} ر.س</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{truck.tripCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      truck.status === 'available' ? 'bg-green-100 text-green-800' :
                      truck.status === 'in-trip' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {truck.status === 'available' ? 'متاحة' :
                       truck.status === 'in-trip' ? 'في رحلة' : 'صيانة'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFuelReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">تقرير استهلاك الوقود</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشاحنة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عدد العمليات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجمالي مبلغ الوقود</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">متوسط التكلفة للعملية</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fuelData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-500">لا توجد بيانات وقود في الفترة المختارة.</td>
                </tr>
              ) : (
                fuelData.map((item) => (
                  <tr key={item.truck} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.truck}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700 font-bold">{item.amount.toLocaleString()} ر.س</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.avgCost.toLocaleString()} ر.س</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDriverReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">كفاءة السائقين</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  السائق
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجمالي الرحلات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الرحلات المكتملة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نسبة الكفاءة
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {driverEfficiency.map((driver) => (
                <tr key={driver.driver} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {driver.driver}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {driver.totalTrips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {driver.completedTrips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${driver.efficiency}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{driver.efficiency}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'performance':
        return renderPerformanceReport();
      case 'profitability':
        return renderProfitabilityReport();
      case 'fuel':
        return renderFuelReport();
      case 'drivers':
        return renderDriverReport();
      default:
        return renderPerformanceReport();
    }
  };

  return (
    <Layout title="التقارير">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* اختيار نوع التقرير */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <FileText className="h-5 w-5 text-gray-400" />
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="performance">تقرير الأداء</option>
                <option value="profitability">تقرير الربحية</option>
                <option value="fuel">تقرير الوقود</option>
                <option value="drivers">تقرير السائقين</option>
              </select>
            </div>
            {/* اختيار الفترة */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Calendar className="h-5 w-5 text-gray-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع الفترات</option>
                <option value="this-month">هذا الشهر</option>
                <option value="last-month">الشهر الماضي</option>
                <option value="last-3-months">آخر 3 شهور</option>
                <option value="this-year">هذا العام</option>
                <option value="last-year">العام الماضي</option>
              </select>
            </div>
            {/* اختيار الشاحنة */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              <select
                value={selectedTruck}
                onChange={(e) => setSelectedTruck(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">كل الشاحنات</option>
                {trucks.map(truck => (
                  <option key={truck.id} value={truck.id}>{truck.number}</option>
                ))}
              </select>
            </div>
            {/* زر تصدير التقرير */}
            <button
              onClick={handleExportReport}
              className="flex items-center space-x-2 rtl:space-x-reverse bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>تصدير التقرير</span>
            </button>
          </div>
        </div>
        {/* محتوى التقرير */}
        {renderReportContent()}
      </div>
    </Layout>
  );
}