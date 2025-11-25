import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { StatCard } from '../components/Cards/StatCard';
import { AddExpenseModal } from '../components/Modals/AddExpenseModal';
import { DollarSign, TrendingUp, Fuel, Wrench, Receipt, Plus, Filter, Calendar, Download, FileSpreadsheet, Trash } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useExpenses } from '../hooks/useExpenses';
import { useMaintenance } from '../hooks/useMaintenance';
import { exportExpensesToExcel } from '../utils/exportUtils';
import { useTrucks } from '../hooks/useTrucks';
import { useAuth } from '../contexts/AuthContext';
import { expensesAPI } from '../services/api';

export function ExpensesPage() {
  const { expenses, refetch } = useExpenses();
  const { addMaintenanceRecord } = useMaintenance();
  const { trucks } = useTrucks();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [selectedTruck, setSelectedTruck] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptImageSrc, setReceiptImageSrc] = useState<string | null>(null);

  // Calculate statistics
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const fuelExpenses = expenses.filter(e => e.type === 'fuel').reduce((sum, e) => sum + e.amount, 0);
  const maintenanceExpenses = expenses.filter(e => e.type === 'maintenance').reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate expenses by currency
  const sarExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Monthly expenses data for chart
  const monthlyData = [
    { month: 'يناير', fuel: 0, maintenance: 0, fees: 0 },
    { month: 'فبراير', fuel: 0, maintenance: 0, fees: 0 },
    { month: 'مارس', fuel: 0, maintenance: 0, fees: 0 },
    { month: 'أبريل', fuel: 0, maintenance: 0, fees: 0 },
    { month: 'مايو', fuel: 0, maintenance: 0, fees: 0 },
    { month: 'يونيو', fuel: 0, maintenance: 0, fees: 0 },
  ];

  // Expense distribution data
  const expenseDistribution = [
    { name: 'وقود', value: fuelExpenses, color: '#3B82F6' },
    { name: 'صيانة', value: maintenanceExpenses, color: '#10B981' },
    { name: 'رسوم', value: expenses.filter(e => e.type === 'fees').reduce((sum, e) => sum + e.amount, 0), color: '#F59E0B' },
    { name: 'أخرى', value: expenses.filter(e => e.type === 'other').reduce((sum, e) => sum + e.amount, 0), color: '#EF4444' },
  ].filter(item => item.value > 0);

  // دالة محلية لحساب مجموع مصاريف شاحنة
  const getTotalExpensesByTruck = (truckId: string) => {
    return expenses.filter(e => e.truckId === truckId).reduce((sum, e) => sum + e.amount, 0);
  };

  // Truck expenses data
  const truckExpenses = trucks.map(truck => ({
    truck: truck.number,
    amount: getTotalExpensesByTruck(truck.id)
  })).filter(item => item.amount > 0);

  // دالة لتصفير توقيت الساعة والدقائق والثواني
  function normalizeDate(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  // فلترة المصاريف حسب الفترة الزمنية مع مقارنة دقيقة للتواريخ
  const getFilteredByPeriod = (expenses: any[]) => {
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

    // تصفير توقيت الساعة والدقائق والثواني
    startDate = normalizeDate(startDate);
    endDate = normalizeDate(endDate);

    return expenses.filter(e => {
      const expenseDate = normalizeDate(new Date(e.date));
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  };

  // استخدم الفلترة الزمنية مع باقي الفلاتر
  const filteredExpenses = getFilteredByPeriod(expenses).filter(expense => {
    if (user?.role === 'driver') {
      return expense.truckId === user.truckId;
    }
    const matchesTruck = selectedTruck === 'all' || expense.truckId === selectedTruck;
    const matchesType = selectedType === 'all' || expense.type === selectedType;
    return matchesTruck && matchesType;
  });

  const handleAddExpense = async (newExpense: any) => {
    await expensesAPI.create(newExpense); // إضافة المصروف في قاعدة البيانات
    await refetch(); // تحديث البيانات في الجدول
  };

  const handleAddMaintenance = async (newMaintenance: any) => {
    await addMaintenanceRecord(newMaintenance);
  };

  const handleExportExcel = () => {
    exportExpensesToExcel(filteredExpenses, trucks);
  };

  // أضف دالة حذف مصروف
  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      await expensesAPI.delete(expenseId);
      await refetch();
    }
  };

  return (
    <Layout title="تقارير المصاريف">
      <div className="space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="إجمالي مصاريف بالريال"
            value={sarExpenses > 0 ? `${sarExpenses.toLocaleString()} ر.س` : '0 ر.س'}
            icon={Fuel}
            color="blue"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">فلاتر التقارير</h3>
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
                <span>إضافة مصروف</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الفترة الزمنية</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="this-month">هذا الشهر</option>
                <option value="last-month">الشهر الماضي</option>
                <option value="last-3-months">آخر 3 أشهر</option>
                <option value="this-year">هذا العام</option>
                <option value="last-year">من العام الماضي</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الشاحنة</label>
              <select
                value={selectedTruck}
                onChange={(e) => setSelectedTruck(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الشاحنات</option>
                {trucks.map(truck => (
                  <option key={truck.id} value={truck.id}>{truck.number}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع المصروف</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الأنواع</option>
                <option value="fuel">وقود</option>
                <option value="maintenance">صيانة</option>
                <option value="fees">رسوم</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            
          </div>
        </div>

        {/* Charts Row */}
        {(expenseDistribution.length > 0 || truckExpenses.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Expenses Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المصاريف الشهرية</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="fuel" fill="#3B82F6" name="وقود" />
                    <Bar dataKey="maintenance" fill="#10B981" name="صيانة" />
                    <Bar dataKey="fees" fill="#F59E0B" name="رسوم" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Distribution Chart */}
            {expenseDistribution.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع المصاريف</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expenseDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Truck Expenses Chart - مخفي مؤقتاً */}
        {/* {truckExpenses.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">مصاريف الشاحنات</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={truckExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="truck" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#8B5CF6" name="المبلغ (ريال)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )} */}

        {/* Expenses List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">تفاصيل المصاريف</h3>
              <span className="text-sm text-gray-500">
                عرض {filteredExpenses.length} من أصل {expenses.length} مصروف
              </span>
            </div>
          </div>
          
          {filteredExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشاحنة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النوع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الوصف</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">فاتورة</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => {
                    const truck = trucks.find(t => t.id === expense.truckId);
                    return (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString('ar')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {truck?.number || 'غير محدد'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            expense.type === 'fuel' ? 'bg-blue-100 text-blue-800' :
                            expense.type === 'maintenance' ? 'bg-green-100 text-green-800' :
                            expense.type === 'fees' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {expense.type === 'fuel' ? 'وقود' :
                             expense.type === 'maintenance' ? 'صيانة' :
                             expense.type === 'fees' ? 'رسوم' : 'أخرى'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {expense.amount.toLocaleString()} ر.س
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {expense.receiptImage && (
                            <button
                              type="button"
                              onClick={() => { setReceiptImageSrc(expense.receiptImage ?? ''); setReceiptModalOpen(true); }}
                              className="text-blue-600 underline text-xs cursor-pointer hover:text-blue-800"
                              title="عرض الفاتورة"
                            >
                              فاتورة
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-800"
                            title="حذف المصروف"
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">لا توجد مصاريف مسجلة</p>
              <p className="text-sm text-gray-400">ابدأ بإضافة أول مصروف للنظام</p>
            </div>
          )}
        </div>
        {/* Modal لعرض صورة الفاتورة */}
        {receiptModalOpen && receiptImageSrc && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-4 max-w-lg w-full flex flex-col items-center">
              <img src={receiptImageSrc} alt="فاتورة" className="max-h-[70vh] rounded border mb-4" />
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>

      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddExpense}
        onAddMaintenance={handleAddMaintenance}
      />
    </Layout>
  );
}