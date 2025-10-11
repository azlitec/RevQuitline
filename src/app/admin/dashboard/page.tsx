export default function AdminDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600">Welcome to the admin dashboard.</p>
          <p className="text-gray-500 text-sm">This is placeholder content.</p>
        </div>
      </div>
    </div>
  );
}