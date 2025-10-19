/**
 * Client-side verification status cache
 * Reduces realtime connections by caching verification status locally
 */

export interface VerificationCacheData {
  code: string;
  name: string;
  verified: boolean;
  timestamp: number;
  expiresAt: number;
}

export interface VerificationCacheConfig {
  maxAge: number; // Cache validity in milliseconds
  checkInterval: number; // How often to check for updates in milliseconds
}

const DEFAULT_CONFIG: VerificationCacheConfig = {
  maxAge: 10 * 60 * 1000, // 10 minutes (longer cache)
  checkInterval: 0, // Disabled by default - only check when needed
};

class VerificationCache {
  private cache = new Map<string, VerificationCacheData>();
  private config: VerificationCacheConfig;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<VerificationCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get cached verification data
   */
  get(code: string): VerificationCacheData | null {
    const cached = this.cache.get(code);
    
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(code);
      return null;
    }

    return cached;
  }

  /**
   * Set verification data in cache
   */
  set(code: string, data: Omit<VerificationCacheData, 'timestamp' | 'expiresAt'>): void {
    const now = Date.now();
    const cacheData: VerificationCacheData = {
      ...data,
      timestamp: now,
      expiresAt: now + this.config.maxAge,
    };

    this.cache.set(code, cacheData);
    
    // Persist to localStorage for page reloads
    this.persistToStorage();
  }

  /**
   * Update verification status
   */
  updateVerificationStatus(code: string, verified: boolean): void {
    const cached = this.cache.get(code);
    if (cached) {
      cached.verified = verified;
      cached.timestamp = Date.now();
      this.persistToStorage();
    }
  }

  /**
   * Check if cache is valid and not expired
   */
  isValid(code: string): boolean {
    const cached = this.cache.get(code);
    return cached !== null && cached !== undefined && Date.now() <= cached.expiresAt;
  }

  /**
   * Clear cache for a specific code
   */
  clear(code: string): void {
    this.cache.delete(code);
    this.persistToStorage();
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.persistToStorage();
  }

  /**
   * Start periodic cache validation (only if enabled)
   */
  startPeriodicCheck(onUpdate?: (code: string, data: VerificationCacheData) => void): void {
    // Skip if periodic checking is disabled
    if (this.config.checkInterval <= 0) {
      return;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const entries = Array.from(this.cache.entries());
      for (const [code, data] of entries) {
        // Skip if cache is still valid
        if (this.isValid(code)) {
          continue;
        }

        try {
          // Fetch fresh data from server
          const response = await fetch('/api/session', {
            credentials: 'include',
          });

          if (response.ok) {
            const sessionData = await response.json();
            if (sessionData.success && sessionData.data.code === code) {
              const newData = {
                code: sessionData.data.code,
                name: sessionData.data.name,
                verified: sessionData.data.verified,
                timestamp: Date.now(),
                expiresAt: Date.now() + this.config.maxAge,
              };

              this.cache.set(code, newData);
              this.persistToStorage();

              // Notify of update
              if (onUpdate && newData.verified !== data.verified) {
                onUpdate(code, newData);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to refresh verification cache:', error);
        }
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic check
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem('verification_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to persist verification cache:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('verification_cache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();
        
        // Filter out expired entries
        const validEntries = cacheData.filter(([code, data]: [string, VerificationCacheData]) => {
          return data.expiresAt > now;
        });

        this.cache = new Map(validEntries);
      }
    } catch (error) {
      console.warn('Failed to load verification cache:', error);
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ code: string; verified: boolean; age: number }>;
  } {
    const now = Date.now();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([code, data]) => ({
        code,
        verified: data.verified,
        age: now - data.timestamp,
      })),
    };
  }
}

// Export singleton instance
export const verificationCache = new VerificationCache();

// Auto-load from storage on initialization
if (typeof window !== 'undefined') {
  verificationCache.loadFromStorage();
}

