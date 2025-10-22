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
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingData, setFetchingData] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if this is password reset (from /reset-password) or new signup (from /verify)
  const isPasswordReset = searchParams.get('reset') === 'true';

  // Auto-fill code and name from API (verification_codes table)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/verification/status', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.code) {
            setCode(result.data.code);
            setName(result.data.name || '');
          }
        }
      } catch {
        // If fetch fails, user can still enter code manually
      } finally {
          setFetchingData(false);
        }
    };

    fetchData();
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
    <div className="form-container">
      <div className="form-card">
        <Card>
          <CardHeader className="form-header">
            <div className="mb-3">
              <div className="form-icon">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <CardTitle className="form-title">
              {isPasswordReset ? 'Reset Password' : 'Set Password'}
            </CardTitle>
            <CardDescription className="form-description">
              {isPasswordReset 
                ? 'Create a new secure password'
                : 'Complete your account setup'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="form-content">
            {fetchingData ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading your information...</p>
              </div>
            ) : (
              <>
                {/* User Information Display - Compact */}
                <div className="info-section">
                  <div className="info-card">
                    <h3 className="info-title">
                      <svg className="w-3 h-3 mr-1.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Account Info
                    </h3>
                    
                    <div className="space-y-3">
                      {/* Name Display */}
                      {name && (
                        <div className="info-item">
                          <Label className="info-label">
                            Name
                          </Label>
                          <div className="info-value">
                            <p className="info-text">{name}</p>
                          </div>
                        </div>
                      )}

                      {/* Verification Code Display */}
                      {!isPasswordReset && code && (
                        <div className="info-item">
                          <Label className="info-label">
                            Verification Code
                          </Label>
                          <div className="info-value">
                            <div className="info-code">
                              <p className="info-code-text">
                                {code}
                              </p>
                              <p className="info-code-subtitle">
                                Sent via WhatsApp
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Form - Compact */}
                <form onSubmit={handleSubmit} className="form-fields">
                  {/* Hidden field for password reset */}
                  {isPasswordReset && (
                    <Input
                      id="code"
                      type="hidden"
                      value={code}
                    />
                  )}

                  {/* Password Field */}
                  <div className="form-field">
                    <Label htmlFor="password" className="form-label">
                      {isPasswordReset ? 'New Password' : 'Create Password'}
                    </Label>
                    <div className="form-input-container">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={6}
                        className="form-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="form-toggle-button"
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
                    <p className="form-input-help">
                      At least 6 characters with 1 letter
                    </p>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="form-field">
                    <Label htmlFor="confirmPassword" className="form-label">
                      Confirm Password
                    </Label>
                    <div className="form-input-container">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={6}
                        className="form-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="form-toggle-button"
                      >
                        {showConfirmPassword ? (
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

                  {/* Error Display */}
                  {error && (
                    <Alert variant="destructive" className="form-error">
                      <AlertDescription className="form-error-text">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="form-button form-button-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="form-button-loading">
                        <div className="form-button-spinner"></div>
                        {isPasswordReset ? 'Resetting...' : 'Setting...'}
                      </div>
                    ) : (
                      <div className="form-button-loading">
                        <svg className="form-button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isPasswordReset ? 'Reset & Sign In' : 'Set & Sign In'}
                      </div>
                    )}
                  </Button>

                  {/* Back Link */}
                  <div className="form-back-link">
                    <button
                      type="button"
                      onClick={() => router.push('/verify')}
                      className="form-back-button"
                    >
                      ← Back to verification
                    </button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
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

