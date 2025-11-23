import React from 'react';

const AdminDashboardPage: React.FC = () => {
  // NOTE: This component is not currently used in the application.
  // The main admin dashboard content is rendered within `pages/admin/index.tsx`.
  return (
    <div className="bg-black/30 p-6 rounded-lg shadow-lg border border-green-900/30">
      <h2 className="text-2xl font-bold text-green-400">Admin Dashboard</h2>
      <p className="text-gray-400 mt-2">This is a placeholder for the admin dashboard main page.</p>
    </div>
  );
};

export default AdminDashboardPage;
