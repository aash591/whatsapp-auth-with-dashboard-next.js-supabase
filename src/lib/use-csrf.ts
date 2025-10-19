/**
 * React Hook for CSRF Protection
 * Manages CSRF tokens in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { getCSRFToken, storeCSRFToken, getStoredCSRFToken, clearStoredCSRFToken } from './csrf-client';

interface UseCSRFReturn {
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  clearToken: () => void;
  setCsrfToken: (token: string | null) => void;
}

/**
 * React hook for CSRF token management
 * @returns CSRF token state and methods
 */
export function useCSRF(): UseCSRFReturn {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load token from storage on mount
  useEffect(() => {
    const storedToken = getStoredCSRFToken();
    if (storedToken) {
      setCsrfToken(storedToken);
    }
  }, []);

  // Refresh CSRF token
  const refreshToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await getCSRFToken();
      if (token) {
        setCsrfToken(token);
        // Store token with default expiration (15 minutes)
        storeCSRFToken(token, 15 * 60);
      } else {
        setError('Failed to get CSRF token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear CSRF token
  const clearToken = useCallback(() => {
    setCsrfToken(null);
    clearStoredCSRFToken();
  }, []);

  // Auto-refresh token if not available
  useEffect(() => {
    if (!csrfToken && !isLoading) {
      refreshToken();
    }
  }, [csrfToken, isLoading, refreshToken]);

  return {
    csrfToken,
    isLoading,
    error,
    refreshToken,
    clearToken,
    setCsrfToken
  };
}

/**
 * Hook for making authenticated requests with CSRF protection
 */
export function useAuthenticatedRequest() {
  const { csrfToken, refreshToken, isLoading, setCsrfToken } = useCSRF();

  const makeRequest = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    // Use the existing CSRF token from state
    let currentToken = csrfToken;
    
    // Only fetch a new token if we don't have one at all
    if (!currentToken) {
      try {
        currentToken = await getCSRFToken();
        if (currentToken) {
          setCsrfToken(currentToken);
          storeCSRFToken(currentToken, 15 * 60);
        }
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    }

    if (!currentToken) {
      throw new Error('CSRF token not available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': currentToken,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    // If CSRF token is invalid, try to refresh and retry once
    if (response.status === 403) {
      const data = await response.json();
      if (data.code === 'CSRF_PROTECTION_FAILED') {
        // Try to get a fresh token and retry once
        try {
          const freshToken = await getCSRFToken();
          if (freshToken) {
            setCsrfToken(freshToken);
            storeCSRFToken(freshToken, 15 * 60);
            
            // Retry the request with fresh token
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                ...headers,
                'X-CSRF-Token': freshToken,
              },
              credentials: 'include'
            });
            return retryResponse;
          }
        } catch (retryError) {
          console.error('Failed to refresh CSRF token:', retryError);
        }
        throw new Error('CSRF token expired, please try again');
      }
    }

    return response;
  }, [csrfToken, refreshToken]);

  return { makeRequest, csrfToken, isLoading };
}
