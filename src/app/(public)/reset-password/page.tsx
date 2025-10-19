'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticatedRequest } from '@/lib/use-csrf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
export default function ResetPasswordPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState('');
  const router = useRouter();
  const { makeRequest, isLoading: csrfLoading } = useAuthenticatedRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await makeRequest('/api/reset-password', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setCode(data.code);
        
        // Clean phone number and construct WhatsApp URL
        let botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '';
        botNumber = botNumber.replace(/[\s\-\(\)\+]/g, '');
        
        const messageTemplate = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_TEMPLATE || 'verify {CODE}';
        const message = messageTemplate.replace('{CODE}', data.code);
        const encodedMessage = encodeURIComponent(message);
        
        const whatsappUrl = `https://wa.me/${botNumber}?text=${encodedMessage}`;
        
        // Open WhatsApp in new tab
        window.open(whatsappUrl, '_blank');
      } else {
        setError(data.error || 'Failed to initiate password reset');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/');
  };

  const handleSetPassword = () => {
    router.push('/set-password');
  };

  // Show loading if CSRF token is being fetched
  if (csrfLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your phone number to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
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
                className="w-full"
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="text-green-500 text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Code Sent!</h2>
              <p className="text-muted-foreground mb-4">
                We've sent a verification code to your WhatsApp. Please check your messages and reply with the code.
              </p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                Code: <strong>{code}</strong>
              </p>
              <div className="space-y-3">
                <Button
                  onClick={handleSetPassword}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Set New Password
                </Button>
                <Button
                  onClick={handleBackToLogin}
                  variant="secondary"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Button
                variant="link"
                onClick={() => router.push('/signup')}
                className="p-0 h-auto"
              >
                Sign up with WhatsApp
              </Button>
            </p>
            <p className="text-sm text-muted-foreground">
              <Button
                variant="link"
                onClick={handleBackToLogin}
                className="p-0 h-auto"
              >
                Back to Login
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
