/**
 * React hook for managing verification status with client-side caching
 * Reduces realtime connections by using intelligent caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { verificationCache, VerificationCacheData } from './verification-cache';
import { useAuthenticatedRequest } from './use-csrf';

export interface VerificationStatus {
  loading: boolean;
  verified: boolean;
  code: string | null;
  name: string | null;
  error: string | null;
}

export interface UseVerificationStatusOptions {
  enableRealtime?: boolean;
  cacheMaxAge?: number;
  checkInterval?: number;
  autoRedirect?: boolean;
}

export function useVerificationStatus(options: UseVerificationStatusOptions = {}) {
  const {
    enableRealtime = true,
    cacheMaxAge = 10 * 60 * 1000, // 10 minutes (longer cache)
    checkInterval = 0, // Disabled - only check when needed
    autoRedirect = true,
  } = options;

  const router = useRouter();
  const { makeRequest } = useAuthenticatedRequest();
  const [status, setStatus] = useState<VerificationStatus>({
    loading: true,
    verified: false,
    code: null,
    name: null,
    error: null,
  });

  const realtimeSubscription = useRef<any>(null);
  const hasInitialized = useRef(false);

  /**
   * Check verification status from server
   */
  const checkStatus = useCallback(async (): Promise<VerificationStatus> => {
    try {
      const response = await fetch('/api/session', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to check session');
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          loading: false,
          verified: false,
          code: null,
          name: null,
          error: 'Not authenticated',
        };
      }

      return {
        loading: false,
        verified: data.data.verified,
        code: data.data.code,
        name: data.data.name,
        error: null,
      };
    } catch (error) {
      return {
        loading: false,
        verified: false,
        code: null,
        name: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, []);

  /**
   * Update cache with fresh data
   */
  const updateCache = useCallback((data: VerificationStatus) => {
    if (data.code && data.name !== null) {
      verificationCache.set(data.code, {
        code: data.code,
        name: data.name,
        verified: data.verified,
      });
    }
  }, []);

  /**
   * Handle verification status update
   */
  const handleStatusUpdate = useCallback(async (newStatus: VerificationStatus) => {
    setStatus(newStatus);
    updateCache(newStatus);

    // Auto-redirect if verified - but first get JWT token
    if (autoRedirect && newStatus.verified && newStatus.code) {
      try {
        // Get JWT token for the verified user
        const response = await makeRequest('/api/verify-and-auth', {
          method: 'POST',
          body: JSON.stringify({ code: newStatus.code }),
        });

        if (response.ok) {
          // JWT token is now set, redirect to password setup
          setTimeout(() => {
            router.push('/set-password');
          }, 1000);
        } else {
          console.error('Failed to get JWT token after verification');
        }
      } catch (error) {
        console.error('Error getting JWT token:', error);
      }
    }
  }, [autoRedirect, router, updateCache]);

  /**
   * Initialize verification status
   */
  const initializeStatus = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // First, check cache
    const cachedData = verificationCache.get(status.code || '');
    if (cachedData && verificationCache.isValid(status.code || '')) {
      console.log('📦 Using cached verification data');
      handleStatusUpdate({
        loading: false,
        verified: cachedData.verified,
        code: cachedData.code,
        name: cachedData.name,
        error: null,
      });
      return;
    }

    // If no valid cache, fetch from server
    console.log('🌐 Fetching fresh verification data');
    const freshStatus = await checkStatus();
    handleStatusUpdate(freshStatus);
  }, [status.code, checkStatus, handleStatusUpdate]);

  /**
   * Setup realtime subscription
   */
  const setupRealtime = useCallback(async () => {
    if (!enableRealtime || !status.code) return;

    try {
      const { supabase } = await import('@/lib/supabase');
      
      // Clean up existing subscription
      if (realtimeSubscription.current) {
        supabase.removeChannel(realtimeSubscription.current);
      }

      // Create new subscription
      realtimeSubscription.current = supabase
        .channel('verification_updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'verification_codes',
            filter: `code=eq.${status.code}`,
          },
          (payload) => {
            console.log('🔄 Realtime update received:', payload);
            
            if (payload.new.verified === true) {
              const updatedStatus: VerificationStatus = {
                loading: false,
                verified: true,
                code: status.code,
                name: status.name,
                error: null,
              };
              
              // This will also trigger JWT token generation
              handleStatusUpdate(updatedStatus);
            }
          }
        )
        .subscribe();

      console.log('📡 Realtime subscription active');
    } catch (error) {
      console.warn('Failed to setup realtime subscription:', error);
    }
  }, [enableRealtime, status.code, status.name, handleStatusUpdate]);

  /**
   * Setup periodic cache refresh
   */
  const setupPeriodicRefresh = useCallback(() => {
    if (!enableRealtime) return;

    verificationCache.startPeriodicCheck((code, data) => {
      console.log('🔄 Cache refresh detected verification update');
      handleStatusUpdate({
        loading: false,
        verified: data.verified,
        code: data.code,
        name: data.name,
        error: null,
      });
    });
  }, [enableRealtime, handleStatusUpdate]);

  // Initialize on mount
  useEffect(() => {
    initializeStatus();
  }, [initializeStatus]);

  // Setup realtime when we have a code
  useEffect(() => {
    if (status.code && !status.loading) {
      setupRealtime();
    }
  }, [status.code, status.loading, setupRealtime]);

  // Setup periodic refresh (only if enabled)
  useEffect(() => {
    if (status.code && !status.loading && checkInterval > 0) {
      setupPeriodicRefresh();
    }
  }, [status.code, status.loading, checkInterval, setupPeriodicRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeSubscription.current) {
        import('@/lib/supabase').then(({ supabase }) => {
          supabase.removeChannel(realtimeSubscription.current);
        });
      }
      verificationCache.stopPeriodicCheck();
    };
  }, []);

  /**
   * Manual refresh function - only fetches when explicitly called
   */
  const refresh = useCallback(async () => {
    console.log('🔄 Manual refresh requested');
    setStatus(prev => ({ ...prev, loading: true }));
    const freshStatus = await checkStatus();
    handleStatusUpdate(freshStatus);
  }, [checkStatus, handleStatusUpdate]);

  /**
   * Clear cache and logout
   */
  const logout = useCallback(async () => {
    try {
      await makeRequest('/api/logout', { method: 'POST' });
      verificationCache.clearAll();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [router, makeRequest]);

  return {
    ...status,
    refresh,
    logout,
    cacheStats: verificationCache.getStats(),
  };
}
