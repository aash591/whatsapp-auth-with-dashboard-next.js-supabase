'use client';

import { useRouter } from 'next/navigation';
import { useVerificationStatus } from '@/lib/use-verification-status';
import { useState, useEffect } from 'react';

export default function ProtectedPage() {
  const router = useRouter();
  const { loading, verified, name, error, logout } = useVerificationStatus({
    enableRealtime: false, // No need for realtime on protected page
    autoRedirect: false,
  });
  
  const [authMethod, setAuthMethod] = useState<'verification' | 'password' | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication method
  useEffect(() => {
    const checkAuthMethod = async () => {
      try {
        const response = await fetch('/api/session', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Check if this is a password-authenticated user (user ID as code) or verification-based
            if (data.data.code && data.data.code.length > 10) {
              // This looks like a user ID, so it's password authentication
              setAuthMethod('password');
            } else {
              // This is verification-based authentication
              setAuthMethod('verification');
            }
          } else {
            // Not authenticated, redirect to login
            router.push('/login');
          }
        } else {
          // Not authenticated, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthMethod();
  }, [router]);

  // Handle authentication errors
  useEffect(() => {
    if (error && error.includes('Not authenticated')) {
      router.push('/login');
    }
  }, [error, router]);

  // Redirect if not authenticated (moved to useEffect)
  if (!checkingAuth && !loading && !verified && !authMethod) {
    return null; // Will redirect in useEffect
  }

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {name}! 🎉
              </h1>
              <p className="text-gray-600 mt-2">
                {authMethod === 'password' 
                  ? 'You have successfully logged in with your password.'
                  : 'You have successfully verified your account via WhatsApp.'
                }
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
            >
              Logout
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                ✅ Protected Content
              </h2>
              <p className="text-green-700">
                This page is only accessible to authenticated users. Your authentication is secure with:
              </p>
              <ul className="mt-4 space-y-2 text-green-700">
                <li>• {authMethod === 'password' ? 'Password-based authentication' : 'WhatsApp verification'}</li>
                <li>• JWT-based session management</li>
                <li>• Row Level Security (RLS)</li>
                <li>• {authMethod === 'password' ? 'Bcrypt password hashing' : 'Webhook signature verification'}</li>
                <li>• Rate limiting</li>
                <li>• Input validation</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                🔐 Security Features
              </h2>
              <p className="text-blue-700">
                Your session is protected with enterprise-grade security measures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


