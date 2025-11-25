import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTrips } from '../../hooks/useTrips';
import { useExpenses } from '../../hooks/useExpenses';

export function WeeklyPerformanceChart() {
  const { trips } = useTrips();
  const { expenses } = useExpenses();

  // حساب البيانات الأسبوعية
  const getWeeklyData = () => {
    const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 6); // بداية الأسبوع (السبت)

    return days.map((day, index) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + index);
      
      const dayTrips = trips.filter(trip => {
        const tripDate = new Date(trip.startDate);
        return tripDate.toDateString() === dayDate.toDateString();
      });

      const dayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.toDateString() === dayDate.toDateString();
      });

      return {
        day,
        trips: dayTrips.length,
        revenue: dayExpenses.reduce((sum, exp) => sum + exp.amount, 0)
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