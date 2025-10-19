'use client';

import { useRouter } from 'next/navigation';
import { useVerificationStatus } from '@/lib/use-verification-status';
import { useAuthenticatedRequest } from '@/lib/use-csrf';

export default function VerificationStatus() {
  const router = useRouter();
  const { makeRequest } = useAuthenticatedRequest();
  const { loading, verified, code, name, error, cacheStats, refresh } = useVerificationStatus({
    enableRealtime: true,
    autoRedirect: true,
  });

  const handleGetToken = async () => {
    if (!code) return;
    
    try {
      const response = await makeRequest('/api/verify-and-auth', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        router.push('/set-password');
      } else {
        console.error('Failed to get JWT token');
      }
    } catch (error) {
      console.error('Error getting JWT token:', error);
    }
  };

  const openWhatsApp = () => {
    let botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '';
    botNumber = botNumber.replace(/[\s\-\(\)\+]/g, '');
    
    const messageTemplate = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_TEMPLATE || 'verify {CODE}';
    const message = messageTemplate.replace('{CODE}', code || '');
    const encodedMessage = encodeURIComponent(message);
    
    window.open(`https://wa.me/${botNumber}?text=${encodedMessage}`, '_blank');
  };

  // Handle authentication errors
  if (error && error.includes('Not authenticated')) {
    router.push('/');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900">Checking authentication...</h2>
            <p className="text-sm text-gray-500 mt-2">Using cached data when available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center">
          {verified ? (
            <>
              <div className="text-green-500 text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Verified!</h2>
              <p className="text-gray-600 mb-4">Redirecting to password setup...</p>
              <button
                onClick={handleGetToken}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                Continue to Password Setup
              </button>
            </>
          ) : (
            <>
              <div className="text-blue-500 text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Waiting for Verification</h2>
              <p className="text-gray-600 mb-6">
                Send your verification code <strong>{code}</strong> via WhatsApp
              </p>
              <button
                onClick={openWhatsApp}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 mb-4"
              >
                Open WhatsApp
              </button>
              <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
                <div className="animate-pulse mr-2">●</div>
                Smart caching (no polling)
              </div>
              <div className="text-xs text-gray-400">
                Cache: {cacheStats.size} entries • Realtime updates only
              </div>
            </>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}


