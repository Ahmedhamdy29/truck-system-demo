import { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { useData } from '../contexts/DataContext';
import { User } from '../types';

export default function DriversPage() {
  const { users: usersState, trucks: trucksState } = useData();
  const { users, loading: usersLoading, error, updateUser, deleteUser, refetch } = usersState;
  const { trucks, loading: trucksLoading } = trucksState;
  const loading = usersLoading || trucksLoading;
  const [editDriver, setEditDriver] = useState<User | null>(null);
  const [editTruckId, setEditTruckId] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);

  const drivers = users.filter(u => u.role === 'driver');

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
    try {
      await updateUser(editDriver.id, { truckId: editTruckId });
      setShowEditModal(false);
    } catch {
      alert('تعذر حفظ التعديل، يرجى المحاولة مجدداً');
    }
  };
  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      setShowDeleteId(null);
    } catch {
      alert('تعذر حذف السائق، يرجى المحاولة مجدداً');
    }
  };

  return (
    <Layout title="إدارة السائقين">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">قائمة السائقين</h2>
        {loading ? (
          <div>جاري التحميل...</div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">تعذر تحميل السائقين: {error}</p>
            <button
              onClick={() => refetch()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
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
            {drivers.length === 0 && (
              <p className="text-gray-500 text-center py-8">لا يوجد سائقون مسجلون</p>
            )}
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
