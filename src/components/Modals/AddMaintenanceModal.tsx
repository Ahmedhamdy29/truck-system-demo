import React, { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { useTrucks } from '../../hooks/useTrucks';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (maintenance: any) => void;
  selectedTruckId?: string;
}

export function AddMaintenanceModal({ isOpen, onClose, onAdd, selectedTruckId }: AddMaintenanceModalProps) {
  const [formData, setFormData] = useState({
    truckId: selectedTruckId || '',
    type: 'periodic',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    description: '',
    nextDue: ''
  });

  const { trucks, loading } = useTrucks();
  const selectableTrucks = trucks.filter(truck => truck.status === 'available' || truck.status === 'in-trip');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newMaintenance = {
      id: Date.now().toString(),
      truckId: formData.truckId,
      type: formData.type as 'periodic' | 'tire-check' | 'oil-change' | 'comprehensive',
      date: formData.date,
      cost: parseFloat(formData.cost),
      description: formData.description,
      nextDue: formData.nextDue || null
    };

    onAdd(newMaintenance);
    setFormData({
      truckId: selectedTruckId || '',
      type: 'periodic',
      date: new Date().toISOString().split('T')[0],
      cost: '',
      description: '',
      nextDue: ''
    });
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
            <div className="bg-green-100 p-2 rounded-lg">
              <Wrench className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">إضافة صيانة جديدة</h2>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              نوع الصيانة *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="periodic">صيانة دورية</option>
              <option value="tire-check">فحص الإطارات</option>
              <option value="oil-change">تغيير زيت</option>
              <option value="comprehensive">فحص شامل</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التكلفة (ريال) *
            </label>
            <input
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تاريخ الصيانة *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الصيانة القادمة
            </label>
            <input
              type="date"
              name="nextDue"
              value={formData.nextDue}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف الصيانة *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              placeholder="وصف أعمال الصيانة..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              إضافة الصيانة
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}