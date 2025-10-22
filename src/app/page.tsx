'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticatedRequest } from '@/lib/hooks/use-csrf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
export default function Home() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { makeRequest } = useAuthenticatedRequest();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await makeRequest('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <Card>
          <CardHeader className="form-header">
            <div className="mb-3">
              <div className="form-icon">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <CardTitle className="form-title">Welcome Back</CardTitle>
            <CardDescription className="form-description">
              Sign in to your account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="form-content">
            <form onSubmit={handleLogin} className="form-fields">
              <div className="form-field">
                <Label htmlFor="phone" className="form-label">Phone Number</Label>
                <div className="form-input-container">
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-field">
                <Label htmlFor="password" className="form-label">Password</Label>
                <div className="form-input-container">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    className="form-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="form-toggle-button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="form-error">
                  <AlertDescription className="form-error-text">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="form-button form-button-primary"
              >
                {loading ? (
                  <div className="form-button-loading">
                    <div className="form-button-spinner"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Button
                  variant="link"
                  onClick={handleSignUp}
                  className="p-0 h-auto text-slate-600 hover:text-slate-700"
                >
                  Sign up with WhatsApp
                </Button>
              </p>
              <p className="text-sm text-muted-foreground">
                Forgot your password?{' '}
                <Button
                  variant="link"
                  onClick={() => router.push('/reset-password')}
                  className="p-0 h-auto text-slate-600 hover:text-slate-700"
                >
                  Reset Password
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



