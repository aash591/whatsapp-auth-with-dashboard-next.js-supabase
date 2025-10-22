'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SetPasswordForm() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if this is password reset (from /reset-password) or new signup (from /verify)
  const isPasswordReset = searchParams.get('reset') === 'true';

  // Auto-fill code from API (verification_codes table)
  useEffect(() => {
    const fetchCode = async () => {
      try {
        const response = await fetch('/api/verification/status', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.code) {
            setCode(result.data.code);
          }
        }
      } catch {
        // If fetch fails, user can still enter code manually
      }
    };

    fetchCode();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Basic client-side validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!/[a-zA-Z]/.test(password)) {
      setError('Password must contain at least one letter');
      setLoading(false);
      return;
    }

    if (!code || code.length !== 6) {
      setError('Please enter your 6-character verification code');
      setLoading(false);
      return;
    }

    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/auth/csrf-token', {
        credentials: 'include',
      });
      
      if (!csrfResponse.ok) {
        throw new Error('Failed to get CSRF token');
      }

      const { csrfToken } = await csrfResponse.json();

      // Call set-password API
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          code: code.toUpperCase(),
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Password set successfully, JWT cookie is set, redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(data.error || 'Failed to set password. Make sure your code is verified.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            {isPasswordReset ? 'Reset Your Password' : 'Set Your Password'}
          </CardTitle>
          <CardDescription>
            {isPasswordReset 
              ? 'Create a new secure password for your account'
              : 'Enter your verified code and create a secure password'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isPasswordReset && (
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-character code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  disabled={loading}
                  className="text-center text-lg font-mono tracking-wider"
                />
                <p className="text-xs text-gray-500">
                  Enter the code you sent via WhatsApp
                </p>
              </div>
            )}

            {isPasswordReset && (
              <div className="space-y-2">
                <Input
                  id="code"
                  type="hidden"
                  value={code}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">{isPasswordReset ? 'New Password' : 'Password'}</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters with 1 letter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading 
                ? (isPasswordReset ? 'Resetting Password...' : 'Setting Password...') 
                : (isPasswordReset ? 'Reset Password & Sign In' : 'Set Password & Sign In')
              }
            </Button>

            <div className="text-center text-sm text-gray-600">
              <p>
                Haven&apos;t sent your code yet?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/verify')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Go back
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}

