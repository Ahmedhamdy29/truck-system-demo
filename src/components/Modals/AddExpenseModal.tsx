import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { useTrucks } from '../../hooks/useTrucks';
import { useAuth } from '../../contexts/AuthContext';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: any) => void;
  onAddMaintenance?: (maintenance: any) => void; // New prop for maintenance
  selectedTruckId?: string;
}

export function AddExpenseModal({ isOpen, onClose, onAdd, onAddMaintenance, selectedTruckId }: AddExpenseModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    truckId: selectedTruckId || '',
    type: 'fuel',
    amount: '',
    currency: 'SAR' as 'SAR' | 'EGP',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'تشغيلية',
    receiptImage: null as string | null,
  });
  const [maintenanceType, setMaintenanceType] = useState('periodic');
  const maintenanceTypes = [
    { value: 'periodic', label: 'صيانة دورية' },
    { value: 'tire-check', label: 'فحص الإطارات' },
    { value: 'oil-change', label: 'تغيير زيت' },
    { value: 'comprehensive', label: 'فحص شامل' },
  ];

  const { trucks, loading } = useTrucks();
  const selectableTrucks = trucks.filter(truck => truck.status === 'available' || truck.status === 'in-trip');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, receiptImage: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const truckIdToSend = user?.role === 'driver' ? user.truckId : formData.truckId;
    
    // If it's a maintenance expense, create both expense and maintenance record
    if (formData.type === 'maintenance' && onAddMaintenance) {
      // Create maintenance record
      const maintenanceRecord = {
        id: Date.now().toString(),
        truckId: truckIdToSend,
        type: maintenanceType as 'periodic' | 'tire-check' | 'oil-change' | 'comprehensive',
        date: formData.date,
        cost: parseFloat(formData.amount),
        description: formData.description,
        nextDue: null
      };
      
      // Add maintenance record
      onAddMaintenance(maintenanceRecord);
      
      // Don't add to expenses - maintenance costs are tracked separately
      setFormData({
        truckId: selectedTruckId || '',
        type: 'fuel',
        amount: '',
        currency: 'SAR',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'تشغيلية',
        receiptImage: null,
      });
      setMaintenanceType('periodic');
      onClose();
      return;
    }
    
    // For non-maintenance expenses, proceed as normal
    const newExpense = {
      id: Date.now().toString(),
      truckId: truckIdToSend,
      type: formData.type as 'fuel' | 'maintenance' | 'fees' | 'other',
      amount: parseFloat(formData.amount),
      currency: 'SAR',
      date: formData.date,
      description: formData.description,
      category: formData.category,
      receiptImage: formData.receiptImage || null,
    };
    onAdd(newExpense);
    setFormData({
      truckId: selectedTruckId || '',
      type: 'fuel',
      amount: '',
      currency: 'SAR',
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: 'تشغيلية',
      receiptImage: null,
    });
    setMaintenanceType('periodic');
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;
  if (loading) return <div>جاري تحميل الشاحنات...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-purple-100 p-2 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">إضافة مصروف جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الشاحنة *
            </label>
            <select
              name="truckId"
              value={formData.truckId}
              onChange={handleChange}
              required
              disabled={user?.role === 'driver'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">اختر الشاحنة</option>
              {selectableTrucks.map(truck => (
                <option key={truck.id} value={truck.id}>
                  {truck.number} - {truck.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع المصروف *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="fuel">وقود</option>
              <option value="maintenance">صيانة</option>
              <option value="fees">رسوم</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          {/* Show maintenance type selection when maintenance is selected */}
          {formData.type === 'maintenance' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع الصيانة *
              </label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {maintenanceTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المبلغ *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="أدخل المبلغ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التاريخ *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوصف *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="وصف المصروف"
            />
          </div>

          {formData.type !== 'maintenance' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الفئة
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="تشغيلية">تشغيلية</option>
                <option value="إدارية">إدارية</option>
                <option value="صيانة">صيانة</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              صورة الإيصال (اختياري)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {formData.type === 'maintenance' ? 'إضافة صيانة' : 'إضافة مصروف'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}