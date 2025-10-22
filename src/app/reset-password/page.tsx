'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticatedRequest } from '@/lib/hooks/use-csrf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
export default function ResetPasswordPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { makeRequest, isLoading: csrfLoading } = useAuthenticatedRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await makeRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        // Clean phone number and construct WhatsApp URL
        let botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '';
        botNumber = botNumber.replace(/[\s\-\(\)\+]/g, '');
        
        const messageTemplate = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_TEMPLATE || 'verify {CODE}';
        const message = messageTemplate.replace('{CODE}', data.code);
        const encodedMessage = encodeURIComponent(message);
        
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${botNumber}&text=${encodedMessage}`;
        
        // Open WhatsApp first
        window.open(whatsappUrl, '_blank');
        
        // Then redirect to verification waiting page
        router.push('/verify?reset=true');
      } else {
        setError(data.error || 'Failed to initiate password reset');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if CSRF token is being fetched
  if (csrfLoading) {
    return (
      <div className="form-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-card">
        <Card>
          <CardHeader className="form-header">
            <div className="mb-3">
              <div className="form-icon">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
            <CardTitle className="form-title">Reset Password</CardTitle>
            <CardDescription className="form-description">
              Enter your phone number to reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent className="form-content">
            <form onSubmit={handleSubmit} className="form-fields">
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

              {error && (
                <Alert variant="destructive" className="form-error">
                  <AlertDescription className="form-error-text">
                    {error}
                    {error.includes('No account found') && (
                      <div className="mt-2">
                        <Button
                          variant="link"
                          onClick={() => router.push('/signup')}
                          className="p-0 h-auto text-destructive"
                        >
                          Sign up here
                        </Button>
                      </div>
                    )}
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
                    Sending Code...
                  </div>
                ) : (
                  'Send Reset Code'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Button
                  variant="link"
                  onClick={() => router.push('/signup')}
                  className="p-0 h-auto text-slate-600 hover:text-slate-700"
                >
                  Sign up with WhatsApp
                </Button>
              </p>
              <p className="text-sm text-muted-foreground">
                <Button
                  variant="link"
                  onClick={() => router.push('/')}
                  className="p-0 h-auto text-slate-600 hover:text-slate-700"
                >
                  Back to Login
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}