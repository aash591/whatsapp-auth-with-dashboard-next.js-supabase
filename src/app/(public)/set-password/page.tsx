'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVerificationStatus } from '@/lib/use-verification-status';
import { useAuthenticatedRequest } from '@/lib/use-csrf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { makeRequest, isLoading: csrfLoading } = useAuthenticatedRequest();
  
  const { loading: authLoading, verified, name, code } = useVerificationStatus({
    enableRealtime: false,
    autoRedirect: false,
  });

  // Redirect if not verified
  useEffect(() => {
    if (!authLoading && !verified) {
      router.push('/verification-status');
    }
  }, [authLoading, verified, router]);

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

    // Basic client-side validation (server will do full validation)
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      setError('Password must contain at least one letter');
      setLoading(false);
      return;
    }

    try {
      const response = await makeRequest('/api/set-password', {
        method: 'POST',
        body: JSON.stringify({ 
          password,
          code // Include the verification code to link the password to the verified user
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Redirect to protected page with a small delay to ensure cookie is set
          setTimeout(() => {
            router.push('/protected');
          }, 100);
        } else {
          // Check if user already exists
          if (data.redirectToLogin) {
            setError(data.error);
          } else {
            setError(data.error || 'Failed to set password');
          }
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to set password');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || csrfLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!verified) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Set Your Password</CardTitle>
          <CardDescription>
            {name ? `Welcome ${name}!` : 'Please'} set a secure password to {name ? 'complete your account setup' : 'reset your password'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters with at least one letter
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {error.includes('already exists') && (
                    <div className="mt-2">
                      <Button
                        variant="link"
                        onClick={() => router.push('/')}
                        className="p-0 h-auto text-destructive"
                      >
                        Go to Login Page
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Setting Password...' : 'Complete Setup'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => router.push('/')}
              className="p-0 h-auto"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}