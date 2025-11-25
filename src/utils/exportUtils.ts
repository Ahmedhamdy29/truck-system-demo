import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
  // تحويل البيانات إلى ورقة عمل
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // إنشاء مصنف عمل جديد
  const workbook = XLSX.utils.book_new();
  
  // إضافة ورقة العمل للمصنف
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // حفظ الملف
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// تصدير بيانات الشاحنات
export const exportTrucksToExcel = (trucks: any[]) => {
  const exportData = trucks.map(truck => ({
    'رقم الشاحنة': truck.number,
    'الموديل': truck.model,
    'سنة الصنع': truck.year,
    'رقم اللوحة': truck.plateNumber,
    'رقم المحرك': truck.engineNumber,
    'رقم الشاسيه': truck.chassisNumber,
    'الحمولة (طن)': truck.loadCapacity,
    'الحالة': truck.status === 'available' ? 'متاحة' : truck.status === 'in-trip' ? 'في رحلة' : 'صيانة',
    'آخر صيانة': truck.lastMaintenance || 'غير محدد',
    'الصيانة القادمة': truck.nextMaintenance || 'غير محدد',
    'السائق': truck.driverName || 'غير محدد'
  }));

  exportToExcel(exportData, `قائمة_الشاحنات_${new Date().toISOString().split('T')[0]}`, 'الشاحنات');
};

// تصدير بيانات المصاريف
export const exportExpensesToExcel = (expenses: any[], trucks: any[]) => {
  const exportData = expenses.map(expense => {
    const truck = trucks.find(t => t.id === expense.truckId);
    return {
      'رقم الشاحنة': truck?.number || 'غير محدد',
      'نوع المصروف': expense.type === 'fuel' ? 'وقود' : expense.type === 'maintenance' ? 'صيانة' : expense.type === 'fees' ? 'رسوم' : 'أخرى',
      'المبلغ': expense.amount,
      'العملة': expense.currency || 'SAR',
      'التاريخ': expense.date,
      'الوصف': expense.description,
      'الفئة': expense.category
    };
  });

  exportToExcel(exportData, `تقرير_المصاريف_${new Date().toISOString().split('T')[0]}`, 'المصاريف');
};

// تصدير بيانات الصيانة
export const exportMaintenanceToExcel = (maintenance: any[], trucks: any[]) => {
  const exportData = maintenance.map(record => {
    const truck = trucks.find(t => t.id === record.truckId);
    return {
      'رقم الشاحنة': truck?.number || 'غير محدد',
      'نوع الصيانة': record.type === 'periodic' ? 'صيانة دورية' : record.type === 'tire-check' ? 'فحص إطارات' : record.type === 'oil-change' ? 'تغيير زيت' : 'فحص شامل',
      'التاريخ': record.date,
      'التكلفة': record.cost,
      'الوصف': record.description,
      'الصيانة القادمة': record.nextDue || 'غير محدد'
    };
  });

  exportToExcel(exportData, `تقرير_الصيانة_${new Date().toISOString().split('T')[0]}`, 'الصيانة');
};

// تصدير بيانات الرحلات
export const exportTripsToExcel = (trips: any[], trucks: any[]) => {
  const exportData = trips.map(trip => {
    const truck = trucks.find(t => t.id === trip.truckId);
    return {
      'رقم الشاحنة': truck?.number || 'غير محدد',
      'الوجهة': trip.destination,
      'الاتجاه': trip.direction === 'outbound' ? 'ذهاب' : 'عودة',
      'تاريخ البداية': trip.startDate,
      'تاريخ الانتهاء المتوقع': trip.expectedEndDate,
      'تاريخ الانتهاء الفعلي': trip.actualEndDate || 'لم ينته بعد',
      'الحالة': trip.status === 'active' ? 'نشطة' : trip.status === 'completed' ? 'مكتملة' : 'متأخرة',
      'التقدم (%)': trip.progress,
      'الإيرادات': trip.revenue || 0,
      'سبب التأخير': trip.delayReason || 'لا يوجد'
    };
  });

  exportToExcel(exportData, `تقرير_الرحلات_${new Date().toISOString().split('T')[0]}`, 'الرحلات');
};

export const exportProfitabilityReport = (truckProfitability: any[]) => {
  const exportData = truckProfitability.map(truck => ({
    'الشاحنة': truck.truck,
    'إجمالي الإيرادات': truck.totalRevenue || 0,
    'إجمالي التكلفة': truck.totalCost || 0,
    'الربح': truck.profit || 0,
    'عدد الرحلات': truck.tripCount,
    'متوسط التكلفة/رحلة': truck.avgCostPerTrip || 0,
    'الحالة': truck.status
  }));

  exportToExcel(exportData, `تقرير_ربحية_الشاحنات_${new Date().toISOString().split('T')[0]}`, 'الربحية');
};

export const exportFuelReport = (fuelData: any[]) => {
  const exportData = fuelData.map(item => ({
    'الشاحنة': item.truck,
    'عدد العمليات': item.count || 0,
    'إجمالي مبلغ الوقود': item.amount || 0,
    'متوسط التكلفة للعملية': item.avgCost || 0
  }));

  exportToExcel(exportData, `تقرير_الوقود_${new Date().toISOString().split('T')[0]}`, 'الوقود');
};

export const exportPerformanceReport = (data: any) => {
  const exportData = [{
    'إجمالي المصاريف': data.totalExpenses || 0,
    'تكلفة الصيانة': data.totalMaintenanceCost || 0,
    'عدد الرحلات': data.totalTrips || 0,
    'نسبة الإنجاز': `${data.completionRate || 0}%`
  }];

  exportToExcel(exportData, `تقرير_الأداء_${new Date().toISOString().split('T')[0]}`, 'الأداء');
};

export const exportDriverReport = (driverEfficiency: any[]) => {
  const exportData = driverEfficiency.map(driver => ({
    'السائق': driver.driver,
    'إجمالي الرحلات': driver.totalTrips || 0,
    'الرحلات المكتملة': driver.completedTrips || 0,
    'نسبة الكفاءة': `${driver.efficiency || 0}%`
  }));

  exportToExcel(exportData, `تقرير_السائقين_${new Date().toISOString().split('T')[0]}`, 'السائقين');
};