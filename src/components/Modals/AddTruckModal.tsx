import React, { useState, useEffect } from 'react';
import { X, Truck } from 'lucide-react';
import { Truck as TruckType } from '../../types';
import { CreateTruckPayload } from '../../services/api';

interface AddTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (truck: CreateTruckPayload) => Promise<unknown>;
  /** عند تمرير شاحنة يتحول المودال لوضع التعديل */
  initialTruck?: TruckType | null;
  onUpdate?: (id: string, updates: Partial<TruckType>) => Promise<unknown>;
}

const emptyForm = {
  number: '',
  model: '',
  year: String(new Date().getFullYear()),
  plateNumber: '',
  engineNumber: '',
  chassisNumber: '',
  loadCapacity: '',
  status: 'available' as TruckType['status']
};

export function AddTruckModal({ isOpen, onClose, onAdd, initialTruck, onUpdate }: AddTruckModalProps) {
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');

  const isEditing = !!initialTruck;

  // تعبئة النموذج بقيم الشاحنة عند فتح المودال في وضع التعديل
  useEffect(() => {
    if (isOpen) {
      if (initialTruck) {
        setFormData({
          number: initialTruck.number,
          model: initialTruck.model,
          year: String(initialTruck.year),
          plateNumber: initialTruck.plateNumber,
          engineNumber: initialTruck.engineNumber,
          chassisNumber: initialTruck.chassisNumber,
          loadCapacity: String(initialTruck.loadCapacity),
          status: initialTruck.status
        });
      } else {
        setFormData(emptyForm);
      }
      setError('');
    }
  }, [isOpen, initialTruck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...formData,
        year: parseInt(formData.year, 10),
        loadCapacity: parseFloat(formData.loadCapacity),
      };
      if (isEditing && onUpdate && initialTruck) {
        await onUpdate(initialTruck.id, payload);
      } else {
        await onAdd({ ...payload, status: 'available' as const });
      }
      setFormData(emptyForm);
      onClose();
    } catch {
      setError(isEditing ? 'تعذر حفظ تعديلات الشاحنة، يرجى المحاولة مجدداً' : 'تعذر إضافة الشاحنة، يرجى المحاولة مجدداً');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'تعديل الشاحنة' : 'إضافة شاحنة جديدة'}</h2>
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
              رقم الشاحنة *
            </label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              required
              placeholder="مثال: TR-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الموديل *
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              required
              placeholder="مثال: مرسيدس أكتروس"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سنة الصنع *
            </label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
              min="1990"
              max={new Date().getFullYear() + 1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم اللوحة *
            </label>
            <input
              type="text"
              name="plateNumber"
              value={formData.plateNumber}
              onChange={handleChange}
              required
              placeholder="مثال: أ ب ج 1234"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم المحرك *
            </label>
            <input
              type="text"
              name="engineNumber"
              value={formData.engineNumber}
              onChange={handleChange}
              required
              placeholder="مثال: MB123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الشاسيه *
            </label>
            <input
              type="text"
              name="chassisNumber"
              value={formData.chassisNumber}
              onChange={handleChange}
              required
              placeholder="مثال: WDBAC54E1LA123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحمولة (طن) *
            </label>
            <input
              type="number"
              name="loadCapacity"
              value={formData.loadCapacity}
              onChange={handleChange}
              required
              min="1"
              step="0.1"
              placeholder="مثال: 40"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحالة *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="available">متاحة</option>
                <option value="in-trip">في رحلة</option>
                <option value="maintenance">صيانة</option>
              </select>
            </div>
          )}

          <div className="flex space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'حفظ التعديلات' : 'إضافة الشاحنة'}
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
