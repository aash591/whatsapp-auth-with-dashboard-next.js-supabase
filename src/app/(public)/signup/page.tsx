'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticatedRequest } from '@/lib/use-csrf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { makeRequest, isLoading: csrfLoading } = useAuthenticatedRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await makeRequest('/api/generate-code', {
        method: 'POST',
        body: JSON.stringify({ name, whatsappNumber }),
      });

      const data = await response.json();

      if (data.success) {
        // Clean phone number and construct WhatsApp URL
        let botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '';
        botNumber = botNumber.replace(/[\s\-\(\)\+]/g, '');
        
        const messageTemplate = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_TEMPLATE || 'verify {CODE}';
        const message = messageTemplate.replace('{CODE}', data.code);
        const encodedMessage = encodeURIComponent(message);
        
        const whatsappUrl = `https://wa.me/${botNumber}?text=${encodedMessage}`;
        
        // Redirect to verification status page
        router.push('/verification-status');
        
        // Open WhatsApp in new tab
        window.open(whatsappUrl, '_blank');
      } else {
        // Check if user already exists
        if (data.redirectToLogin) {
          setError(data.error);
        } else {
          setError(data.error || 'Failed to generate code');
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Verify your identity via WhatsApp to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Number</Label>
              <Input
                id="phone"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+1234567890"
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
              {loading ? 'Generating Code...' : 'Continue with WhatsApp'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button
                variant="link"
                onClick={() => router.push('/')}
                className="p-0 h-auto"
              >
                Sign in here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
