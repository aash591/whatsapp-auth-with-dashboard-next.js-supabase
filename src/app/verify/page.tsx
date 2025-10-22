'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

function VerificationStatusForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Check if this is password reset (from /reset-password) or new signup
  const isPasswordReset = searchParams.get('reset') === 'true';

  useEffect(() => {
    // Fetch verification status from API
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/verification/status', {
          credentials: 'include',
        });

        if (!response.ok) {
          // No verification session, redirect back
          const redirectUrl = isPasswordReset ? '/reset-password' : '/signup';
          router.push(redirectUrl);
          return;
        }

        const result = await response.json();
        
        if (result.success) {
          setCode(result.data.code);
          setVerified(result.data.verified);
          
          if (result.data.expired) {
            const expiredMessage = isPasswordReset 
              ? 'Your verification code has expired. Please try resetting your password again.'
              : 'Your verification code has expired. Please sign up again.';
            setError(expiredMessage);
          }

          // If verified, auto-redirect to password setup after 2 seconds
          if (result.data.verified && !verified) {
            setTimeout(() => {
              const redirectUrl = isPasswordReset ? '/set-password?reset=true' : '/set-password';
              router.push(redirectUrl);
            }, 2000);
          }
        } else {
          const redirectUrl = isPasswordReset ? '/reset-password' : '/signup';
          router.push(redirectUrl);
        }
      } catch {
        setError('Failed to load verification status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Poll for verification status every 3 seconds if not verified
    let pollInterval: NodeJS.Timeout | null = null;
    if (!verified && !error) {
      pollInterval = setInterval(() => {
        fetchStatus();
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [router, verified, error, isPasswordReset]);

  const openWhatsApp = () => {
    // Get bot number from environment
    let botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '';
    botNumber = botNumber.replace(/[\s\-\(\)\+]/g, '');
    
    // Construct message with code
    const messageTemplate = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_TEMPLATE || 'verify {CODE}';
    const message = messageTemplate.replace('{CODE}', code);
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp with prefilled message
    window.open(`https://api.whatsapp.com/send?phone=${botNumber}&text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading verification status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push(isPasswordReset ? '/reset-password' : '/signup')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              {isPasswordReset ? 'Back to Reset Password' : 'Back to Signup'}
            </button>
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
              <p className="text-gray-600 mb-6">
                Your WhatsApp verification is complete. Click below to set your password.
              </p>
              <button
                onClick={() => {
                  const redirectUrl = isPasswordReset ? '/set-password?reset=true' : '/set-password';
                  router.push(redirectUrl);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 text-lg"
              >
                {isPasswordReset ? 'Continue to Reset Password →' : 'Continue to Password Setup →'}
              </button>
            </>
          ) : (
            <>
              <div className="text-blue-500 text-6xl mb-4">📱</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify Your Account</h2>
              <p className="text-gray-600 mb-6">
                Send your verification code to our WhatsApp bot to activate your account.
              </p>
              
              <div className="space-y-4">
                {/* Display the code prominently */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                  <p className="text-sm text-gray-600 mb-2">Your Verification Code:</p>
                  <p className="text-4xl font-bold text-blue-600 tracking-wider font-mono">{code}</p>
                  <p className="text-xs text-gray-500 mt-2">💡 This is also your referral code!</p>
                </div>

                {/* WhatsApp button */}
                <button
                  onClick={openWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-lg"
                >
                  <span className="text-2xl">💬</span>
                  Send Code via WhatsApp
                </button>
                
                {/* Instructions */}
                <div className="bg-gray-50 p-4 rounded-lg text-left">
                  <p className="text-sm font-semibold text-gray-700 mb-2">📋 Next Steps:</p>
                  <ol className="text-sm text-gray-600 list-decimal list-inside space-y-2">
                    <li>Click the button above to open WhatsApp</li>
                    <li>Send the pre-filled message to our bot</li>
                    <li>Wait for the bot&apos;s confirmation reply</li>
                    <li>This page will auto-update when verified</li>
                  </ol>
                </div>

                {/* Waiting indicator */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                    <p className="text-sm text-yellow-800">
                      ⏳ Waiting for verification... This page will auto-refresh.
                    </p>
                  </div>
                </div>
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

export default function VerificationStatus() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <VerificationStatusForm />
    </Suspense>
  );
}

