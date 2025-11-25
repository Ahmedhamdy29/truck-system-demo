import React from 'react';
import { Layout } from '../components/Layout/Layout';
import { StatCard } from '../components/Cards/StatCard';
import { TruckStatusChart } from '../components/Charts/TruckStatusChart';
import { WeeklyPerformanceChart } from '../components/Charts/WeeklyPerformanceChart';
import { Truck, Route, DollarSign, AlertTriangle, MapPin, Clock, Plus } from 'lucide-react';
import { useTrucks } from '../hooks/useTrucks';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function DashboardPage() {
  const { trucks, loading, error } = useTrucks();
  const { expenses } = useData();
  const { user } = useAuth();

  // Redirect driver to their truck page
  if (user?.role === 'driver' && user.truckId) {
    return <Navigate to={`/trucks/${user.truckId}`} replace />;
  }
  
  if (loading) {
    return (
      <Layout title="لوحة التحكم">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="mr-3 text-gray-600">جاري تحميل البيانات...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="لوحة التحكم">
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

  const availableTrucks = trucks.filter(t => t.status === 'available').length;
  const inTripTrucks = trucks.filter(t => t.status === 'in-trip').length;
  const maintenanceTrucks = trucks.filter(t => t.status === 'maintenance').length;
  const activeTrucks = trucks.filter(t => t.currentTrip);

  const sarExpenses = expenses.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Layout title="لوحة التحكم">
      <div className="space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="إجمالي الشاحنات"
            value={trucks.length}
            icon={Truck}
            color="blue"
          />
          <StatCard
            title="الرحلات النشطة"
            value={inTripTrucks}
            icon={Route}
            color="green"
          />
          <StatCard
            title="إجمالي مصاريف بالريال"
            value={sarExpenses > 0 ? `${sarExpenses.toLocaleString()} ر.س` : '0 ر.س'}
            icon={DollarSign}
            color="purple"
          />
          <StatCard
            title="في الصيانة"
            value={maintenanceTrucks}
            icon={AlertTriangle}
            color="yellow"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* TruckStatusChart مخفي مؤقتاً */}
          {/* <TruckStatusChart trucks={trucks} /> */}
          <WeeklyPerformanceChart />
        </div>

        {/* Active Trips and Welcome */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Trips */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">الرحلات النشطة</h3>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">الآن</span>
              </div>
            </div>
            
            {activeTrucks.length > 0 ? (
              <div className="space-y-4">
                {activeTrucks.slice(0, 3).map((truck) => (
                  <div key={truck.id} className="flex items-center space-x-4 rtl:space-x-reverse p-3 bg-gray-50 rounded-lg">
                        <div className="bg-blue-100 p-2 rounded-lg">
                      <MapPin className="h-4 w-4 text-blue-600" />
                        </div>
                    <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{truck.number}</h4>
                      <p className="text-sm text-gray-600">
                        {truck.currentTrip?.destination} - {truck.currentTrip?.progress}%
                      </p>
                    </div>
                    <div className="text-left rtl:text-right">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${truck.currentTrip?.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                {activeTrucks.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    و {activeTrucks.length - 3} رحلات أخرى نشطة
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Route className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد رحلات نشطة حالياً</p>
              </div>
            )}
          </div>

          {/* Welcome Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200 p-6">
            <div className="text-center">
              <div className="bg-blue-600 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">مرحباً بك في نظام إدارة الشاحنات</h3>
              <p className="text-gray-600 mb-6">
                {trucks.length === 0 
                  ? 'ابدأ بإضافة أول شاحنة لأسطولك وتتبع جميع العمليات بسهولة'
                  : 'تابع أداء أسطولك وإدارة جميع العمليات من مكان واحد'
                }
              </p>
              {trucks.length === 0 && (
                <div className="space-y-3">
                  <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    إضافة شاحنة جديدة
                  </button>
                  <p className="text-sm text-gray-500">أو ابدأ بإضافة مصروف أو سجل صيانة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}