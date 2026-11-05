import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { CreateExpensePayload } from '../../services/api';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: CreateExpensePayload) => Promise<unknown>;
  selectedTruckId?: string;
}

const emptyForm = {
  truckId: '',
  type: 'fuel' as 'fuel' | 'fees' | 'other',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  category: 'تشغيلية',
  receiptImage: null as string | null,
};

export function AddExpenseModal({ isOpen, onClose, onAdd, selectedTruckId }: AddExpenseModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');

  // مزامنة الشاحنة المختارة مسبقاً عند كل فتح للمودال
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, truckId: selectedTruckId || prev.truckId }));
      setError('');
    }
  }, [isOpen, selectedTruckId]);

  const { trucks: trucksState } = useData();
  const { trucks, loading } = trucksState;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const truckIdToSend = user?.role === 'driver' ? user.truckId : formData.truckId;

      // العملة مثبتة SAR فقط، وتوليد الـ id من مسؤولية الخادم
      const newExpense: CreateExpensePayload = {
        truckId: truckIdToSend ?? '',
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: 'SAR',
        date: formData.date,
        description: formData.description,
        category: formData.category,
        receiptImage: formData.receiptImage || null,
      };
      await onAdd(newExpense);
      setFormData({ ...emptyForm, truckId: selectedTruckId || '' });
      onClose();
    } catch {
      setError('تعذر إضافة المصروف، يرجى المحاولة مجدداً');
    }
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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
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
              <option value="fees">رسوم</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المبلغ (ريال سعودي) *
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
              <option value="أخرى">أخرى</option>
            </select>
          </div>

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
              إضافة مصروف
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
