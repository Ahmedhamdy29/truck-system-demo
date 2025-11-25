import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { AddExpenseModal } from '../components/Modals/AddExpenseModal';
import { AddMaintenanceModal } from '../components/Modals/AddMaintenanceModal';
import { AddTripModal } from '../components/Modals/AddTripModal';
import { useTrucks } from '../hooks/useTrucks';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Truck as TruckIcon, 
  MapPin, 
  Calendar, 
  Wrench, 
  DollarSign, 
  Edit, 
  Plus,
  Route,
  Fuel,
  Settings,
  FileSpreadsheet
} from 'lucide-react';
import { exportExpensesToExcel } from '../utils/exportUtils';

export function TruckDetailPage() {
  const { id } = useParams();
  const { expenses, maintenance, trips } = useData();
  const [activeTab, setActiveTab] = useState('details');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptImageSrc, setReceiptImageSrc] = useState<string | null>(null);
  const [isUpdateTripModalOpen, setIsUpdateTripModalOpen] = useState(false);
  const [tripUpdateType, setTripUpdateType] = useState<'completed' | 'delayed' | ''>('');
  const [delayReason, setDelayReason] = useState('');
  
  const { trucks, loading } = useTrucks();
  const truck = trucks.find(t => t.id === id);
  const { user } = useAuth();
  
  // Debugging output
  // console.log('user.truckId:', user?.truckId);
  // console.log('trucks:', trucks);
  // console.log('id from URL:', id);

  // Prevent driver from accessing other trucks' pages
  if (user?.role === 'driver' && id !== user.truckId) {
    return <Navigate to={`/trucks/${user.truckId}`} replace />;
  }

  if (loading) return <div>جاري تحميل بيانات الشاحنة...</div>;

  // معالجة حالة عدم وجود الشاحنة عند السائق
  if (user?.role === 'driver' && !truck) {
    return <div style={{textAlign: 'center', marginTop: '50px', color: 'red', fontWeight: 'bold'}}>لا توجد شاحنة مرتبطة بهذا السائق أو الشاحنة غير موجودة في النظام.</div>;
  }

  if (!truck) {
    return <Navigate to="/trucks" replace />;
  }

  const truckExpenses = expenses.getExpensesByTruck(id!);
  const truckMaintenance = maintenance.getMaintenanceByTruck(id!);
  const totalExpenses = expenses.getTotalExpensesByTruck(id!);

  // استخراج الرحلة النشطة لهذه الشاحنة
  const truckTrips = trips.getTripsByTruck(id!);
  const currentTrip = truckTrips.find(trip => trip.status === 'active');

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

  const tabs = [
    { id: 'details', label: 'التفاصيل', icon: TruckIcon },
    { id: 'trip', label: 'الرحلة الحالية', icon: Route },
    { id: 'expenses', label: 'المصاريف', icon: DollarSign },
    { id: 'maintenance', label: 'الصيانة', icon: Wrench },
  ];

  const handleAddExpense = (newExpense: any) => {
    expenses.addExpense(newExpense);
  };

  const handleAddMaintenance = async (newMaintenance: any) => {
    try {
      await maintenance.addMaintenanceRecord(newMaintenance);
      setIsMaintenanceModalOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء إضافة الصيانة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleAddTrip = (newTrip: any) => {
    trips.addTrip(newTrip);
  };

  // تخصيص واجهة السائق: عرض كل شيء في شاشة واحدة مبسطة
  if (user?.role === 'driver') {
    return (
      <Layout title={`شاحنتي (${truck.number})`}>
        <div className="space-y-8">
          {/* بيانات الشاحنة */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">بيانات الشاحنة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between"><span className="text-gray-600">رقم الشاحنة:</span><span>{truck.number}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">الموديل:</span><span>{truck.model}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">سنة الصنع:</span><span>{truck.year}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">رقم اللوحة:</span><span>{truck.plateNumber}</span></div>
              </div>
              <div>
                <div className="flex justify-between"><span className="text-gray-600">رقم المحرك:</span><span>{truck.engineNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">رقم الشاسيه:</span><span>{truck.chassisNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">الحمولة:</span><span>{truck.loadCapacity} طن</span></div>
              </div>
            </div>
          </div>

          {/* مصروفات الشاحنة */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">مصاريف الشاحنة</h2>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة مصروف</span>
              </button>
            </div>
            {truckExpenses.length > 0 ? (
              <div className="space-y-2">
                {truckExpenses.map((expense) => (
                  <div key={expense.id} className="border border-gray-100 rounded-lg p-3 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div>
                      <div className="font-medium text-gray-900">{expense.description}</div>
                      <div className="text-xs text-gray-500">{expense.category} - {new Date(expense.date).toLocaleDateString('ar')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-purple-700">{expense.amount.toLocaleString()} ر.س</div>
                      {expense.receiptImage && (
                        <button
                          type="button"
                          onClick={() => { setReceiptImageSrc(expense.receiptImage ?? ''); setReceiptModalOpen(true); }}
                          className="text-blue-600 underline text-xs ml-2 rtl:ml-0 rtl:mr-2 cursor-pointer hover:text-blue-800"
                          title="عرض الفاتورة"
                        >
                          فاتورة
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">لا توجد مصاريف مسجلة لهذه الشاحنة</div>
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

          {/* رحلات الشاحنة */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">رحلات الشاحنة</h2>
            </div>
            {trips.trips.filter(trip => trip.truckId === truck.id).length > 0 ? (
              <div className="space-y-2">
                {trips.trips.filter(trip => trip.truckId === truck.id).map((trip) => (
                  <div key={trip.id} className="border border-gray-100 rounded-lg p-3 flex flex-col md:flex-row md:justify-between md:items-center">
                    <div>
                      <div className="font-medium text-gray-900">{trip.destination}</div>
                      <div className="text-xs text-gray-500">{trip.direction === 'outbound' ? 'ذهاب' : 'عودة'} - {new Date(trip.startDate).toLocaleDateString('ar')}</div>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse mt-2 md:mt-0">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${trip.status === 'active' ? 'bg-blue-100 text-blue-800' : trip.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{trip.status === 'active' ? 'نشطة' : trip.status === 'completed' ? 'مكتملة' : 'متأخرة'}</span>
                      <button
                        onClick={() => setIsTripModalOpen(true)}
                        className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        <Edit className="h-3 w-3" />
                        <span>تحديث</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">لا توجد رحلات مسجلة لهذه الشاحنة</div>
            )}
          </div>

          {/* مودال إضافة مصروف */}
          <AddExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            onAdd={handleAddExpense}
            onAddMaintenance={handleAddMaintenance}
            selectedTruckId={id}
          />
          {/* مودال تحديث الرحلة */}
          <AddTripModal
            isOpen={isTripModalOpen}
            onClose={() => setIsTripModalOpen(false)}
            onAdd={handleAddTrip}
            selectedTruckId={id}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`تفاصيل الشاحنة ${truck.number}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="bg-blue-100 p-3 rounded-xl">
                <TruckIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{truck.number}</h1>
                <p className="text-gray-600">{truck.model} - {truck.year}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(truck.status)}`}>
                  {getStatusText(truck.status)}
                </span>
              </div>
            </div>
            <div className="text-left rtl:text-right">
              <p className="text-2xl font-bold text-purple-600">{totalExpenses.toLocaleString()} ر.س</p>
              <p className="text-sm text-gray-500">إجمالي المصاريف</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 rtl:space-x-reverse px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 rtl:space-x-reverse py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">البيانات الأساسية</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID الشاحنة:</span>
                        <span className="font-mono text-xs text-blue-700">{truck.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">رقم الشاحنة:</span>
                        <span className="font-medium">{truck.number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">الموديل:</span>
                        <span className="font-medium">{truck.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">سنة الصنع:</span>
                        <span className="font-medium">{truck.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">رقم اللوحة:</span>
                        <span className="font-medium">{truck.plateNumber}</span>
                      </div>
                      {/* اسم السائق */}
                      {truck.driverName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">السائق:</span>
                          <span className="font-medium">{truck.driverName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">الحمولة:</span>
                        <span className="font-medium">{truck.loadCapacity} طن</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">المعلومات التقنية</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">رقم المحرك:</span>
                        <span className="font-medium">{truck.engineNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">رقم الشاسيه:</span>
                        <span className="font-medium">{truck.chassisNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">آخر صيانة:</span>
                        <span className="font-medium">
                          {truck.lastMaintenance ? new Date(truck.lastMaintenance).toLocaleDateString('ar') : 'غير محدد'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">الصيانة القادمة:</span>
                        <span className="font-medium">
                          {truck.nextMaintenance ? new Date(truck.nextMaintenance).toLocaleDateString('ar') : 'غير محدد'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trip Tab */}
            {activeTab === 'trip' && (
              <div className="space-y-6">
                {currentTrip ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">الرحلة الحالية</h3>
                      {(user?.role === 'admin' || user?.role === 'driver') && (
                        <button
                          className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          onClick={() => setIsUpdateTripModalOpen(true)}
                        >
                          <Edit className="h-4 w-4" />
                          <span>تحديث الرحلة</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">{currentTrip.destination}</p>
                          <p className="text-sm text-blue-700">
                            {currentTrip.direction === 'outbound' ? 'رحلة ذهاب' : 'رحلة عودة'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700">تقدم الرحلة</span>
                          <span className="font-medium text-blue-900">{currentTrip.progress}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-3">
                          <div 
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${currentTrip.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-blue-700">تاريخ البدء:</span>
                          <p className="font-medium text-blue-900">
                            {new Date(currentTrip.startDate).toLocaleDateString('ar')}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-700">التاريخ المتوقع:</span>
                          <p className="font-medium text-blue-900">
                            {new Date(currentTrip.expectedEndDate).toLocaleDateString('ar')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد رحلة حالية</h3>
                    <p className="text-gray-500 mb-4">الشاحنة متاحة حالياً لرحلة جديدة</p>
                    <button 
                      onClick={() => setIsTripModalOpen(true)}
                      className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>إضافة رحلة جديدة</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">مصاريف الشاحنة</h3>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="text-left rtl:text-right">
                      <p className="text-2xl font-bold text-gray-900">{totalExpenses.toLocaleString()} ر.س</p>
                      <p className="text-sm text-gray-500">إجمالي المصاريف</p>
                    </div>
                    <button 
                      onClick={() => setIsExpenseModalOpen(true)}
                      className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>إضافة مصروف</span>
                    </button>
                    <button
                      onClick={() => exportExpensesToExcel(truckExpenses, [truck])}
                      className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>تصدير Excel</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {truckExpenses.map((expense) => (
                    <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <DollarSign className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{expense.description}</p>
                            <p className="text-sm text-gray-500">{expense.category}</p>
                          </div>
                        </div>
                        <div className="text-left rtl:text-right">
                          <p className="font-bold text-gray-900">{expense.amount.toLocaleString()} ر.س</p>
                          <p className="text-sm text-gray-500">
                            {new Date(expense.date).toLocaleDateString('ar')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {truckExpenses.length === 0 && (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد مصاريف مسجلة لهذه الشاحنة</p>
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">تاريخ الصيانة</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-green-700 font-bold bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                      إجمالي الصيانة: {truckMaintenance.reduce((sum, m) => sum + m.cost, 0).toLocaleString()} ر.س
                    </span>
                    <button 
                      onClick={() => setIsMaintenanceModalOpen(true)}
                      className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>إضافة صيانة</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {truckMaintenance.map((maintenanceRecord) => (
                    <div key={maintenanceRecord.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <Wrench className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{maintenanceRecord.description}</p>
                            <p className="text-sm text-gray-500">
                              {maintenanceRecord.type === 'periodic' && 'صيانة دورية'}
                              {maintenanceRecord.type === 'tire-check' && 'فحص الإطارات'}
                              {maintenanceRecord.type === 'oil-change' && 'تغيير زيت'}
                              {maintenanceRecord.type === 'comprehensive' && 'فحص شامل'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-left rtl:text-right">
                          <p className="font-bold text-gray-900">{maintenanceRecord.cost.toLocaleString()} ر.س</p>
                          <p className="text-sm text-gray-500">
                            {new Date(maintenanceRecord.date).toLocaleDateString('ar')}
                          </p>
                          <button
                            onClick={() => maintenance.deleteMaintenanceRecord(maintenanceRecord.id)}
                            className="text-red-600 hover:text-red-800 px-2 py-1 rounded transition-colors border border-red-200 bg-red-50 text-xs"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                      {maintenanceRecord.nextDue && (
                        <p className="text-sm text-yellow-600 mt-2">
                          الصيانة القادمة: {new Date(maintenanceRecord.nextDue).toLocaleDateString('ar')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {truckMaintenance.length === 0 && (
                  <div className="text-center py-8">
                    <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد سجلات صيانة لهذه الشاحنة</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onAdd={handleAddExpense}
        selectedTruckId={id}
      />

      <AddMaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        onAdd={handleAddMaintenance}
        selectedTruckId={id}
      />

      <AddTripModal
        isOpen={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        onAdd={handleAddTrip}
        selectedTruckId={id}
      />

      {/* Modal تحديث الرحلة */}
      {isUpdateTripModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-900">تحديث حالة الرحلة</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">اختر الحالة:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tripUpdateType"
                      value="completed"
                      checked={tripUpdateType === 'completed'}
                      onChange={() => setTripUpdateType('completed')}
                    />
                    تم الوصول
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tripUpdateType"
                      value="delayed"
                      checked={tripUpdateType === 'delayed'}
                      onChange={() => setTripUpdateType('delayed')}
                    />
                    تأخر بسبب
                  </label>
                </div>
              </div>
              {tripUpdateType === 'delayed' && (
                <div>
                  <label className="block mb-2 font-medium">سبب التأخير:</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={delayReason}
                    onChange={e => setDelayReason(e.target.value)}
                    placeholder="اكتب سبب التأخير..."
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
                onClick={async () => {
                  if (!tripUpdateType || !truck.currentTrip) return;
                  if (tripUpdateType === 'completed') {
                    await trips.updateTrip(truck.currentTrip.id, { status: 'completed', actualEndDate: new Date().toISOString() });
                  } else if (tripUpdateType === 'delayed') {
                    await trips.updateTrip(truck.currentTrip.id, { status: 'delayed', delayReason });
                  }
                  setIsUpdateTripModalOpen(false);
                  setTripUpdateType('');
                  setDelayReason('');
                  await trips.refetch();
                }}
                disabled={tripUpdateType === 'delayed' && !delayReason}
              >
                حفظ
              </button>
              <button
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300"
                onClick={() => {
                  setIsUpdateTripModalOpen(false);
                  setTripUpdateType('');
                  setDelayReason('');
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}