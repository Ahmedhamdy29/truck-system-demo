import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../../contexts/DataContext';

export function WeeklyPerformanceChart() {
  const { trips } = useData();

  // حساب البيانات الأسبوعية
  const getWeeklyData = () => {
    const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 6); // بداية الأسبوع (السبت)

    return days.map((day, index) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + index);

      const dayTrips = trips.trips.filter(trip => {
        const tripDate = new Date(trip.startDate);
        return tripDate.toDateString() === dayDate.toDateString();
      });

      // الإيرادات = مجموع trip.revenue للرحلات التي بدأت في ذلك اليوم.
      // revenue هو الإيراد المتوقع المُدخل عند إنشاء الرحلة، والرحلات بلا revenue تُحسب صفراً.
      const revenue = dayTrips.reduce((sum, trip) => sum + (trip.revenue ?? 0), 0);

      return {
        day,
        trips: dayTrips.length,
        revenue
      };
    });
  };

  const data = getWeeklyData();
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">الأداء الأسبوعي</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="trips"
              stroke="#3B82F6"
              strokeWidth={2}
              name="عدد الرحلات"
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={2}
              name="الإيرادات (ريال)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">بيانات الأداء الأسبوعي</p>
      </div>
    </div>
  );
}
