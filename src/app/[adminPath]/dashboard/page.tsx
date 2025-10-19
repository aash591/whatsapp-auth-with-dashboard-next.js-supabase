'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  lastLogin: string;
}

export default function AdminDashboard() {
  const params = useParams();
  const adminPath = params.adminPath;
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await fetch('/api/admin/auth/me');
        const data = await response.json();
        
        if (data.success) {
          setAdminUser(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  return (
    <div className="space-y-6 m-0 p-0">
      {/* Welcome Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {adminUser?.name}!</h2>
        <p className="text-gray-600">Here's what's happening with your system today.</p>
      </div>
    </div>
  );
}