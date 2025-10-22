'use client';

import { useRouter } from 'next/navigation';
import { useVerificationStatus } from '@/lib/hooks/use-verification-status';
import { useCSRF } from '@/lib/hooks/use-csrf';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Gift, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Dashboard Components
import { StatsCards } from '@/components/user-dashboard/StatsCards';
import { ReferralLinkCard } from '@/components/user-dashboard/ReferralLinkCard';
import { ReferredByCard } from '@/components/user-dashboard/ReferredByCard';
import { HowItWorksCard } from '@/components/user-dashboard/HowItWorksCard';
import { ReferralsListCard } from '@/components/user-dashboard/ReferralsListCard';

export default function ProtectedPage() {
  const router = useRouter();
  const { loading, verified, name, error, logout } = useVerificationStatus({
    enableRealtime: false,
    autoRedirect: false,
  });
  const { csrfToken, refreshToken } = useCSRF();
  
  const [authMethod, setAuthMethod] = useState<'verification' | 'password' | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userData, setUserData] = useState<{ 
    id: string; 
    name: string; 
    whatsapp_number: string; 
    referral_code?: string;
    referral_points?: number; 
    available_points?: number; 
    total_referrals?: number;
    total_points_earned?: number;
    total_points_redeemed?: number;
    verified_at?: string;
    referred_at?: string;
    is_fraudulent?: boolean;
    referred_by_code?: string;
  } | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Referrals list state
  const [referrals, setReferrals] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    verified: boolean;
    joinedAt: string;
    verifiedAt?: string;
  }>>([]);
  const [referralsLoading, setReferralsLoading] = useState(true);

  // Check authentication method and get user data
  useEffect(() => {
    const checkAuthMethod = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserData(data.data);
            // Generate referral link
            const baseUrl = window.location.origin;
            const referralCode = data.data.referral_code;
            if (referralCode) {
              setReferralLink(`${baseUrl}/signup?ref=${referralCode}`);
            }
            
            // Fetch referrer's name if user was referred
            if (data.data.referred_by_code) {
              try {
                const referrerResponse = await fetch(`/api/users/by-code/${data.data.referred_by_code}`, {
                  credentials: 'include',
                });
                if (referrerResponse.ok) {
                  const referrerData = await referrerResponse.json();
                  if (referrerData.success && referrerData.data?.name) {
                    setReferrerName(referrerData.data.name);
                  }
                }
              } catch (err) {
                console.log('Could not fetch referrer name:', err);
              }
            }
            
            if (data.data.code && data.data.code.length > 10) {
              setAuthMethod('password');
            } else {
              setAuthMethod('verification');
            }
          } else {
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthMethod();
  }, [router]);

  // Fetch referrals list
  useEffect(() => {
    const fetchReferrals = async () => {
      if (!userData?.id) return;
      
      try {
        setReferralsLoading(true);
        const response = await fetch('/api/users/referrals', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.referrals) {
            setReferrals(data.data.referrals);
          }
        }
      } catch (error) {
        console.error('Failed to fetch referrals:', error);
      } finally {
        setReferralsLoading(false);
      }
    };

    fetchReferrals();
  }, [userData?.id]);

  // Handle authentication errors
  useEffect(() => {
    if (error && error.includes('Not authenticated')) {
      router.push('/login');
    }
  }, [error, router]);

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      // You could add a toast notification here
      alert('Referral link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on this platform!',
          text: 'Use my referral code to get started',
          url: referralLink,
        });
      } catch (err) {
        console.error('Error sharing: ', err);
      }
    } else {
      copyReferralLink();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordLoading(true);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword)) {
      setPasswordError('Password must contain at least one letter');
      setPasswordLoading(false);
      return;
    }

    try {
      // Get CSRF token
      let token = csrfToken;
      if (!token) {
        token = await refreshToken();
        if (!token) {
          setPasswordError('Invalid security token. Please refresh and try again.');
          setPasswordLoading(false);
          return;
        }
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        credentials: 'include',
        body: JSON.stringify({
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsChangePasswordOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        alert('Password changed successfully!');
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch {
      setPasswordError('Something went wrong. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Redirect if not authenticated
  if (!checkingAuth && !loading && !verified && !authMethod) {
    return null;
  }

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile-First Header - Compact */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Title */}
            <h1 className="text-lg font-semibold text-gray-900">My Account</h1>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-500 text-white">
                      {name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{name}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {userData?.whatsapp_number || 'User'}
                    </p>
                  </div>
                </div>
                <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Optimized */}
      <main className="pb-6">
        {/* Welcome Banner - Mobile First */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 py-6 text-white">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Hi, {userData?.name?.split(' ')[0] || 'there'}! 👋</h1>
            </div>
            <p className="text-blue-100 text-sm">
              Share your link and earn rewards
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
          {/* Stats Cards */}
          <StatsCards
            totalReferrals={userData?.total_referrals || 0}
            referralPoints={userData?.referral_points || 0}
            availablePoints={userData?.available_points || 0}
          />

          {/* Referral Link Card */}
          <ReferralLinkCard
            referralLink={referralLink}
            onCopy={copyReferralLink}
            onShare={shareReferralLink}
          />

          {/* Referred By Card - If user was referred */}
          {userData?.referred_by_code && (
            <ReferredByCard
              referredByCode={userData.referred_by_code}
              referrerName={referrerName}
            />
          )}

          {/* How It Works */}
          <HowItWorksCard />

          {/* Referrals List */}
          <ReferralsListCard
            referrals={referrals}
            loading={referralsLoading}
          />
        </div>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Choose a new password for your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="At least 6 characters with 1 letter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {passwordError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {passwordError}
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


