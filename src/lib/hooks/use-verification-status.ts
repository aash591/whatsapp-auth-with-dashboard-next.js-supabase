/**
 * React hook for managing verification status with client-side caching
 * Reduces realtime connections by using intelligent caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { verificationCache } from '../verification/verification-cache';

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
    checkInterval = 0, // Disabled - only check when needed
    autoRedirect = true,
  } = options;

  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>({
    loading: true,
    verified: false,
    code: null,
    name: null,
    error: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeSubscription = useRef<any>(null);
  const hasInitialized = useRef(false);

  /**
   * Check verification status from server
   */
  const checkStatus = useCallback(async (): Promise<VerificationStatus> => {
    try {
      const response = await fetch('/api/auth/session', {
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

    // Auto-redirect if verified - NO JWT until password is set
    if (autoRedirect && newStatus.verified && newStatus.code) {
      // Simply redirect to password setup page
      // JWT will be issued AFTER password is created
      setTimeout(() => {
        router.push('/set-password');
      }, 1000);
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
      const { supabase } = await import('@/lib/database/supabase');
      
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
        import('@/lib/database/supabase').then(({ supabase }) => {
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
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      verificationCache.clearAll();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [router]);

  return {
    ...status,
    refresh,
    logout,
    cacheStats: verificationCache.getStats(),
  };
}
