import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { AlertTriangle } from 'lucide-react';

export function NotFoundPage() {
  return (
    <Layout title="صفحة غير موجودة">
      <div className="text-center py-16">
        <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">الصفحة غير موجودة</h2>
        <p className="text-gray-500 mb-6">الرابط الذي تحاول الوصول إليه غير موجود أو تم نقله.</p>
        <Link
          to="/"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
        >
          العودة إلى لوحة التحكم
        </Link>
      </div>
    </Layout>
  );
}
