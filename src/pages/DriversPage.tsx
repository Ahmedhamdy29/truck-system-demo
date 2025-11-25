import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { usersAPI, trucksAPI } from '../services/api';
import { User, Truck } from '../types';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDriver, setEditDriver] = useState<User | null>(null);
  const [editTruckId, setEditTruckId] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
    fetchTrucks();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const all = await usersAPI.getAll();
    setDrivers(all.filter((u: User) => u.role === 'driver'));
    setLoading(false);
  };
  const fetchTrucks = async () => {
    const all = await trucksAPI.getAll();
    setTrucks(all);
  };

  const handleEdit = (driver: User) => {
    setEditDriver(driver);
    setEditTruckId(driver.truckId || '');
    setShowEditModal(true);
  };
  const handleSave = async () => {
    if (!editDriver) return;
    // Ensure truckId is valid before saving
    if (editTruckId && !trucks.some(t => t.id === editTruckId)) {
      alert('يجب اختيار شاحنة صحيحة من القائمة');
      return;
    }
    await usersAPI.update(editDriver.id, { truckId: editTruckId });
    setShowEditModal(false);
    fetchDrivers();
  };
  const handleDelete = async (id: string) => {
    await usersAPI.delete(id);
    setShowDeleteId(null);
    fetchDrivers();
  };

  return (
    <Layout title="إدارة السائقين">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">قائمة السائقين</h2>
        {loading ? (
          <div>جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl border border-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2">الاسم</th>
                  <th className="px-4 py-2">اسم المستخدم</th>
                  <th className="px-4 py-2">الجوال</th>
                  <th className="px-4 py-2">الشاحنة المرتبطة</th>
                  <th className="px-4 py-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => {
                  const truck = trucks.find(t => t.id === driver.truckId);
                  return (
                    <tr key={driver.id} className="border-t">
                      <td className="px-4 py-2">{driver.name}</td>
                      <td className="px-4 py-2">{driver.username}</td>
                      <td className="px-4 py-2">{driver.phone || '-'}</td>
                      <td className="px-4 py-2">{truck ? truck.number : <span className="text-gray-400">غير مرتبط</span>}</td>
                      <td className="px-4 py-2 space-x-2 rtl:space-x-reverse">
                        <button onClick={() => handleEdit(driver)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">تعديل</button>
                        <button onClick={() => setShowDeleteId(driver.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">حذف</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* مودال التعديل */}
        {showEditModal && editDriver && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">تعديل ربط الشاحنة للسائق</h3>
              <div className="mb-4">
                <label className="block mb-1">اختر الشاحنة</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={editTruckId}
                  onChange={e => setEditTruckId(e.target.value)}
                >
                  <option value="">غير مرتبط</option>
                  {trucks.map(truck => (
                    <option key={truck.id} value={truck.id}>{truck.number} - {truck.model}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-200 rounded">إلغاء</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">حفظ</button>
              </div>
            </div>
          </div>
        )}

        {/* مودال الحذف */}
        {showDeleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4">تأكيد حذف السائق</h3>
              <p className="mb-4">هل أنت متأكد أنك تريد حذف هذا السائق؟ لا يمكن التراجع.</p>
              <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                <button onClick={() => setShowDeleteId(null)} className="px-4 py-2 bg-gray-200 rounded">إلغاء</button>
                <button onClick={() => handleDelete(showDeleteId)} className="px-4 py-2 bg-red-600 text-white rounded">حذف</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 