/**
 * React Hook for CSRF Protection
 * CSRF tokens are stored in HTTP-only cookies by the server
 * This hook manages the token value for use in request headers
 */

import { useState, useCallback } from 'react';
import { getCSRFToken } from '../security/csrf';

interface UseCSRFReturn {
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<string | null>;
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

  // Refresh CSRF token
  // Token is stored in HTTP-only cookie by server automatically
  const _refreshToken = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await getCSRFToken();
      if (token) {
        // Store token in state for use in request headers
        // The actual token is also stored in HTTP-only cookie by server
        setCsrfToken(token);
        return token; // Return the token
      } else {
        setError('Failed to get CSRF token');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []); // Fixed: Explicitly return Promise<string | null>

  // Clear CSRF token from state
  // Note: HTTP-only cookie will expire naturally (10 min max-age)
  const clearToken = useCallback(() => {
    setCsrfToken(null);
  }, []);

  // Don't auto-fetch on mount - only fetch when explicitly needed
  // This prevents unnecessary API calls on every page load

  return {
    csrfToken,
    isLoading,
    error,
    refreshToken: _refreshToken,
    clearToken,
    setCsrfToken
  };
}

/**
 * Hook for making authenticated requests with CSRF protection
 */
export function useAuthenticatedRequest() {
  const { csrfToken, isLoading, setCsrfToken } = useCSRF();

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
          // Store in state for header use
          // Server automatically stores in HTTP-only cookie
          setCsrfToken(currentToken);
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
      credentials: 'include' // Important: includes HTTP-only CSRF cookie
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
            
            // Retry the request with fresh token
            // Fresh cookie is automatically included
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
  }, [csrfToken, setCsrfToken]);

  return { makeRequest, csrfToken, isLoading };
}
