'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function AdminRootPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Redirect to dashboard when accessing the admin root
    router.replace(`/${params.adminPath}/dashboard`);
  }, [router, params.adminPath]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}
