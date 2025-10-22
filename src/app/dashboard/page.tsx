'use client';

import { useRouter } from 'next/navigation';
import { useVerificationStatus } from '@/lib/hooks/use-verification-status';
import { useCSRF } from '@/lib/hooks/use-csrf';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
// Removed shadcn dropdown import
import { LogOut, Gift, Key, Eye, EyeOff } from 'lucide-react';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownOpen && !target.closest('[data-dropdown]')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden overflow-y-auto">

      {/* Main Content - Mobile Optimized */}
      <main className="pb-6">
        {/* Welcome Banner - Mobile First */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 py-6 text-white">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gift className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Hi, {userData?.name?.split(' ')[0] || 'there'}! 👋</h1>
              </div>
              
              {/* User Menu */}
              <div className="relative flex-shrink-0" data-dropdown>
                <div 
                  className={`h-10 w-10 rounded-full border-2 border-white/30 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                    dropdownOpen 
                      ? 'bg-white/20' 
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="text-white text-lg font-bold">
                    {name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                
                <div className={`absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 transition-all duration-200 ease-out transform ${
                  dropdownOpen 
                    ? 'opacity-100 scale-100 translate-y-0' 
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}>
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{userData?.whatsapp_number || 'User'}</p>
                  </div>
                  <div className="py-1">
                    <button 
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors duration-150"
                      onClick={() => {
                        setIsChangePasswordOpen(true);
                        setDropdownOpen(false);
                      }}
                    >
                      <Key className="mr-2 h-4 w-4 text-gray-600" />
                      Change Password
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors duration-150"
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4 text-gray-600" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
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
        <DialogContent className="popup-container">
          <DialogHeader className="popup-header">
            <DialogTitle className="popup-title">Change Password</DialogTitle>
            <DialogDescription className="popup-description">
              Choose a new password for your account.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleChangePassword} className="popup-content">
            <div className="popup-fields">
              <div className="popup-field">
                <Label htmlFor="newPassword" className="popup-label">
                  New Password
                </Label>
                <div className="popup-input-container">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="At least 6 characters with 1 letter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={passwordLoading}
                    className="popup-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="popup-toggle-button"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="popup-input-help">
                  At least 6 characters with 1 letter
                </p>
              </div>
              
              <div className="popup-field">
                <Label htmlFor="confirmPassword" className="popup-label">
                  Confirm New Password
                </Label>
                <div className="popup-input-container">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={passwordLoading}
                    className="popup-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="popup-toggle-button"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              {passwordError && (
                <div className="popup-error">
                  <div className="popup-error-text">
                    {passwordError}
                  </div>
                </div>
              )}
            </div>
            
            <div className="popup-buttons">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
                className="popup-button popup-button-secondary"
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={passwordLoading}
                className="popup-button popup-button-primary"
              >
                {passwordLoading ? (
                  <div className="popup-button-loading">
                    <div className="popup-button-spinner"></div>
                    Changing...
                  </div>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


