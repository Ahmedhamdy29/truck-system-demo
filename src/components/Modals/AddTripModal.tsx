import React, { useState, useEffect } from 'react';
import { X, Route } from 'lucide-react';
import { useTrucks } from '../../hooks/useTrucks';

interface AddTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (trip: any) => void;
  selectedTruckId?: string;
}

export function AddTripModal({ isOpen, onClose, onAdd, selectedTruckId }: AddTripModalProps) {
  const [formData, setFormData] = useState({
    truckId: selectedTruckId || '',
    destination: '',
    direction: 'outbound',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    progress: '0',
    revenue: ''
  });

  useEffect(() => {
    if (selectedTruckId) {
      setFormData(prev => ({ ...prev, truckId: selectedTruckId }));
    }
  }, [selectedTruckId]);

  const { trucks, loading } = useTrucks();
  const availableTrucks = trucks.filter(truck => truck.status === 'available');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTrip = {
      id: Date.now().toString(),
      truckId: formData.truckId,
      destination: formData.destination,
      direction: formData.direction as 'outbound' | 'return',
      startDate: formData.startDate,
      expectedEndDate: formData.expectedEndDate,
      status: 'active' as const,
      progress: parseInt(formData.progress),
      revenue: formData.revenue ? parseFloat(formData.revenue) : null
    };

    onAdd(newTrip);
    setFormData({
      truckId: selectedTruckId || '',
      destination: '',
      direction: 'outbound',
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      progress: '0',
      revenue: ''
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
            <div className="bg-blue-100 p-2 rounded-lg">
              <Route className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">إضافة رحلة جديدة</h2>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر الشاحنة</option>
              {availableTrucks.map(truck => (
                <option key={truck.id} value={truck.id}>
                  {truck.number} - {truck.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوجهة *
            </label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              required
              placeholder="مثال: الرياض، جدة، الدمام..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اتجاه الرحلة *
            </label>
            <select
              name="direction"
              value={formData.direction}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="outbound">ذهاب</option>
              <option value="return">عودة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تاريخ البدء *
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التاريخ المتوقع للانتهاء *
            </label>
            <input
              type="date"
              name="expectedEndDate"
              value={formData.expectedEndDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تقدم الرحلة (%)
            </label>
            <input
              type="number"
              name="progress"
              value={formData.progress}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مبلغ الرحلة (الإيراد المتوقع) *
            </label>
            <input
              type="number"
              name="revenue"
              value={formData.revenue}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="مثال: 5000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              إضافة الرحلة
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