/**
 * Client-side CSRF Protection
 * Handles CSRF token management for frontend requests
 */

interface CSRFTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
  message?: string;
}

/**
 * Get CSRF token from server (HttpOnly cookie approach)
 * @returns Promise with CSRF token
 */
export async function getCSRFToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Failed to get CSRF token:', response.statusText);
      return null;
    }
    
    const data: CSRFTokenResponse = await response.json();
    
    if (!data.success) {
      console.error('CSRF token generation failed:', data.message);
      return null;
    }
    
    // Store token in memory (not sessionStorage since it's HttpOnly)
    if (data.expiresIn) {
      storeCSRFTokenInMemory(data.token, data.expiresIn);
    }
    
    return data.token;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
}

/**
 * Make authenticated request with CSRF protection
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Promise with response
 */
export async function makeAuthenticatedRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Get CSRF token
  const csrfToken = await getCSRFToken();
  
  if (!csrfToken) {
    throw new Error('Failed to get CSRF token');
  }
  
  // Add CSRF token to headers
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}

/**
 * Submit form with CSRF protection
 * @param formData - Form data to submit
 * @param url - Form submission URL
 * @returns Promise with response
 */
export async function submitFormWithCSRF(
  formData: FormData,
  url: string
): Promise<Response> {
  // Get CSRF token
  const csrfToken = await getCSRFToken();
  
  if (!csrfToken) {
    throw new Error('Failed to get CSRF token');
  }
  
  // Add CSRF token to form data
  formData.append('csrf_token', csrfToken);
  
  return fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
}

// In-memory storage for CSRF tokens (since cookies are HttpOnly)
let csrfTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Store CSRF token in memory (HttpOnly cookie approach)
 * @param token - CSRF token to store
 * @param expiresIn - Token expiration time in seconds
 */
export function storeCSRFTokenInMemory(token: string, expiresIn: number): void {
  const expiresAt = Date.now() + (expiresIn * 1000);
  csrfTokenCache = { token, expiresAt };
}

/**
 * Store CSRF token in session storage (legacy - for backward compatibility)
 * @param token - CSRF token to store
 * @param expiresIn - Token expiration time in seconds
 */
export function storeCSRFToken(token: string, expiresIn: number): void {
  if (typeof window === 'undefined') return;
  
  const expiresAt = Date.now() + (expiresIn * 1000);
  
  sessionStorage.setItem('csrf_token', token);
  sessionStorage.setItem('csrf_expires_at', expiresAt.toString());
}

/**
 * Get stored CSRF token (HttpOnly cookie approach)
 * @returns CSRF token or null
 */
export function getStoredCSRFToken(): string | null {
  // Check in-memory cache first (HttpOnly approach)
  if (csrfTokenCache) {
    if (Date.now() > csrfTokenCache.expiresAt) {
      csrfTokenCache = null;
      return null;
    }
    return csrfTokenCache.token;
  }
  
  // Fallback to sessionStorage for backward compatibility
  if (typeof window === 'undefined') return null;
  
  const token = sessionStorage.getItem('csrf_token');
  const expiresAt = sessionStorage.getItem('csrf_expires_at');
  
  if (!token || !expiresAt) {
    return null;
  }
  
  // Check if token expired
  if (Date.now() > parseInt(expiresAt)) {
    clearStoredCSRFToken();
    return null;
  }
  
  return token;
}

/**
 * Clear stored CSRF token (HttpOnly cookie approach)
 */
export function clearStoredCSRFToken(): void {
  // Clear in-memory cache
  csrfTokenCache = null;
  
  // Clear sessionStorage for backward compatibility
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem('csrf_token');
  sessionStorage.removeItem('csrf_expires_at');
}

/**
 * Check if CSRF token is valid and not expired (HttpOnly cookie approach)
 * @returns True if token is valid
 */
export function isCSRFTokenValid(): boolean {
  return getStoredCSRFToken() !== null;
}
