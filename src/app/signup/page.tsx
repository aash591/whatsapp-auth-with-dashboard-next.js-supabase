'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthenticatedRequest } from '@/lib/hooks/use-csrf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SignUpForm() {
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { makeRequest } = useAuthenticatedRequest();

  // Clear any old auth cookies when signup page loads
  useEffect(() => {
    // Clear auth_token cookie client-side
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }, []);

  // Auto-populate referral code from URL parameter
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await makeRequest('/api/verification/create', {
        method: 'POST',
        body: JSON.stringify({ name, whatsappNumber, referralCode }),
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
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
        
        // DON'T auto-redirect - let user click to go to verify page
        // This prevents the page from navigating away before WhatsApp opens
        router.push('/verify');
      } else {
        // Check if user already exists
        if (data.redirectToLogin) {
          setError(data.error);
        } else {
          setError(data.error || 'Failed to generate code');
        }
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                </svg>
              </div>
            </div>
            <CardTitle className="form-title">Create Account</CardTitle>
            <CardDescription className="form-description">
              Verify your identity via WhatsApp to get started
            </CardDescription>
          </CardHeader>
          
          <CardContent className="form-content">
            <form onSubmit={handleSubmit} className="form-fields">
              <div className="form-field">
                <Label htmlFor="name" className="form-label">Your Name</Label>
                <div className="form-input-container">
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-field">
                <Label htmlFor="phone" className="form-label">WhatsApp Number</Label>
                <div className="form-input-container">
                  <Input
                    id="phone"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="9876543210"
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-field">
                <Label htmlFor="referralCode" className="form-label">Referral Code (Optional)</Label>
                <div className="form-input-container">
                  <Input
                    id="referralCode"
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="A1B2C3"
                    maxLength={6}
                    disabled={loading}
                    className="form-input uppercase"
                  />
                </div>
                {referralCode && (
                  <p className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2">
                    🎉 Referral code applied! You&apos;ll earn bonus points when you sign up.
                  </p>
                )}
                <p className="form-input-help">
                  Enter a friend&apos;s referral code to get bonus points
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="form-error">
                  <AlertDescription className="form-error-text">
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
                className="form-button form-button-primary"
              >
                {loading ? (
                  <div className="form-button-loading">
                    <div className="form-button-spinner"></div>
                    Generating Code...
                  </div>
                ) : (
                  'Continue with WhatsApp'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button
                  variant="link"
                  onClick={() => router.push('/')}
                  className="p-0 h-auto text-slate-600 hover:text-slate-700"
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="form-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}
