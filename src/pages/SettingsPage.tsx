import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Settings, Users } from 'lucide-react';
import { User } from '../types';
import { useData } from '../contexts/DataContext';

export function SettingsPage() {
  const { users: usersState, trucks: trucksState } = useData();
  const { users, addUser, updateUser, deleteUser } = usersState;
  const { trucks } = trucksState;
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'driver',
    email: '',
    phone: '',
    truckId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    truckId: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    return err instanceof Error ? err.message : fallback;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Ensure truckId is a valid id from the trucks list
      const truckIdToSend = form.role === 'driver' ? form.truckId : '';
      if (form.role === 'driver' && truckIdToSend && !trucks.some(t => t.id === truckIdToSend)) {
        setError('يجب اختيار شاحنة صحيحة من القائمة');
        setLoading(false);
        return;
      }
      await addUser({ ...form, role: form.role as 'admin' | 'driver', truckId: truckIdToSend });
      setShowAddModal(false);
      setForm({
        username: '',
        password: '',
        name: '',
        role: 'driver',
        email: '',
        phone: '',
        truckId: ''
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'حدث خطأ أثناء الإضافة'));
    }
    setLoading(false);
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      truckId: user.truckId || ''
    });
    setShowEditModal(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setLoading(true);
    setError('');
    try {
      // Ensure truckId is a valid id from the trucks list
      const truckIdToSend = editUser.role === 'driver' ? editForm.truckId : '';
      if (editUser.role === 'driver' && truckIdToSend && !trucks.some(t => t.id === truckIdToSend)) {
        setError('يجب اختيار شاحنة صحيحة من القائمة');
        setLoading(false);
        return;
      }
      await updateUser(editUser.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        truckId: truckIdToSend
      });
      setShowEditModal(false);
      setEditUser(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'حدث خطأ أثناء التعديل'));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      await deleteUser(id);
      setShowDeleteId(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'حدث خطأ أثناء الحذف'));
    }
    setLoading(false);
  };

  return (
    <Layout title="إعدادات النظام">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إعدادات النظام</h1>
              <p className="text-gray-600">إدارة إعدادات نظام الشاحنات</p>
            </div>
          </div>
        </div>

        {/* Users Section — تبويب المستخدمين هو الوحيد الفعّال؛
            حُذفت تبويبات عام/إشعارات/أمان لأنها كانت واجهات ديكور بلا حفظ فعلي */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>إدارة المستخدمين</span>
                </h3>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => setShowAddModal(true)}
                >
                  إضافة مستخدم جديد
                </button>
              </div>

              {error && !showAddModal && !showEditModal && (
                <div className="text-red-600">{error}</div>
              )}

              {/* مودال إضافة مستخدم */}
              {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <form
                    className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md space-y-4"
                    onSubmit={handleAddUser}
                  >
                    <h2 className="text-xl font-bold mb-2">إضافة مستخدم جديد</h2>
                    {error && <div className="text-red-600">{error}</div>}
                    <input
                      className="w-full border p-2 rounded"
                      placeholder="اسم المستخدم"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      required
                    />
                    <input
                      className="w-full border p-2 rounded"
                      placeholder="كلمة المرور"
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required
                    />
                    <input
                      className="w-full border p-2 rounded"
                      placeholder="الاسم"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                    <select
                      className="w-full border p-2 rounded"
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    >
                      <option value="driver">سائق</option>
                      <option value="admin">مدير</option>
                    </select>
                    <input
                      className="w-full border p-2 rounded"
                      placeholder="البريد الإلكتروني"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                    <input
                      className="w-full border p-2 rounded"
                      placeholder="رقم الجوال"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                    {form.role === 'driver' && (
                      <select
                        className="w-full border p-2 rounded"
                        value={form.truckId}
                        onChange={e => setForm(f => ({ ...f, truckId: e.target.value }))}
                        required
                      >
                        <option value="">اختر الشاحنة</option>
                        {trucks.map(truck => (
                          <option key={truck.id} value={truck.id}>
                            {truck.number} - {truck.model}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-300 rounded"
                        onClick={() => setShowAddModal(false)}
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                        disabled={loading}
                      >
                        {loading ? 'جاري الإضافة...' : 'إضافة'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                  <div key={user.id} className="bg-gray-50 rounded-lg p-4 flex flex-col space-y-2">
                    <div className="font-bold">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.username} - {user.role === 'admin' ? 'مدير' : 'سائق'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-500">{user.phone}</div>
                    {user.role === 'driver' && (
                      <div className="text-xs text-blue-600">
                        الشاحنة: {trucks.find(t => t.id === user.truckId)?.number || 'غير مرتبط'}
                      </div>
                    )}
                    <div className="flex space-x-2 rtl:space-x-reverse mt-2">
                      <button
                        className="px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500"
                        onClick={() => handleEdit(user)}
                      >
                        تعديل
                      </button>
                      <button
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => setShowDeleteId(user.id)}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* مودال تعديل المستخدم */}
              {showEditModal && editUser && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <form
                    className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md space-y-4"
                    onSubmit={handleEditSave}
                  >
                    <h2 className="text-xl font-bold mb-2">تعديل بيانات المستخدم</h2>
                    {error && <div className="text-red-600">{error}</div>}
                    <input
                      className="w-full border p-2 rounded"
                      placeholder="الاسم"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                    <input
                      className="w-full border p-2 rounded"
                      placeholder="البريد الإلكتروني"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    />
                    <input
                      className="w-full border p-2 rounded"
                      placeholder="رقم الجوال"
                      value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    />
                    {editUser.role === 'driver' && (
                      <select
                        className="w-full border p-2 rounded"
                        value={editForm.truckId}
                        onChange={e => setEditForm(f => ({ ...f, truckId: e.target.value }))}
                      >
                        <option value="">اختر الشاحنة</option>
                        {trucks.map(truck => (
                          <option key={truck.id} value={truck.id}>
                            {truck.number} - {truck.model}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-300 rounded"
                        onClick={() => setShowEditModal(false)}
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                        disabled={loading}
                      >
                        {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* تأكيد الحذف */}
              {showDeleteId && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md space-y-4">
                    <h2 className="text-xl font-bold mb-2 text-center">تأكيد حذف المستخدم</h2>
                    <p className="text-center">هل أنت متأكد أنك تريد حذف هذا المستخدم؟ لا يمكن التراجع.</p>
                    {error && <div className="text-red-600 text-center">{error}</div>}
                    <div className="flex justify-center space-x-2 rtl:space-x-reverse">
                      <button
                        className="px-4 py-2 bg-gray-300 rounded"
                        onClick={() => setShowDeleteId(null)}
                      >
                        إلغاء
                      </button>
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded"
                        onClick={() => handleDelete(showDeleteId)}
                        disabled={loading}
                      >
                        {loading ? 'جاري الحذف...' : 'حذف'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
