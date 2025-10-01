/**
 * API Client Provider
 * Ensures the global apiClient has Clerk authentication
 */

import { useEffect, useRef } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { apiClient } from '@/lib/api-client';

interface ApiClientProviderProps {
  children: React.ReactNode;
}

// Store the original requestRaw method
let originalRequestRaw: any = null;
let isOverridden = false;

export function ApiClientProvider({ children }: ApiClientProviderProps) {
  const clerkAuth = useClerkAuth();
  const hasOverriddenRef = useRef(false);

  useEffect(() => {
    console.log('ApiClientProvider - Clerk auth state:', {
      isLoaded: clerkAuth?.isLoaded,
      isSignedIn: clerkAuth?.isSignedIn,
      hasGetToken: !!clerkAuth?.getToken
    });

    // Override the requestRaw method only once
    if (!hasOverriddenRef.current && !isOverridden) {
      hasOverriddenRef.current = true;
      isOverridden = true;
      
      // Store the original method
      originalRequestRaw = (apiClient as any).requestRaw.bind(apiClient);
      
      // Override with our wrapper
      (apiClient as any).requestRaw = async function(...args: any[]) {
        const [endpoint, options = {}, isRetry, noToast] = args;
        
        // Try to get fresh token if Clerk is ready
        const auth = (window as any).__clerkAuth;
        console.log('ApiClientProvider - Request intercepted:', {
          endpoint,
          hasAuth: !!auth,
          isLoaded: auth?.isLoaded,
          isSignedIn: auth?.isSignedIn,
          hasGetToken: !!auth?.getToken
        });
        
        // Wait for Clerk to be loaded before trying to get token
        if (auth?.isLoaded && auth?.isSignedIn && auth?.getToken) {
          try {
            const token = await auth.getToken();
            console.log('ApiClientProvider - Token retrieved:', {
              endpoint,
              hasToken: !!token,
              tokenLength: token?.length
            });
            
            if (token) {
              // Ensure headers object exists
              if (!options.headers) {
                options.headers = {};
              }
              options.headers['Authorization'] = `Bearer ${token}`;
              console.log('ApiClientProvider - Authorization header added');
            } else {
              console.warn('ApiClientProvider - getToken returned null/undefined');
            }
          } catch (error) {
            console.error('ApiClientProvider - Failed to get Clerk token:', error);
          }
        } else if (!auth?.isLoaded) {
          console.log('ApiClientProvider - Clerk not loaded yet, skipping auth for:', endpoint);
        } else {
          console.log('ApiClientProvider - Cannot get token:', {
            hasAuth: !!auth,
            isLoaded: auth?.isLoaded,
            isSignedIn: auth?.isSignedIn,
            hasGetToken: !!auth?.getToken
          });
        }
        
        return originalRequestRaw(endpoint, options, isRetry, noToast);
      };
    }

    // Store the current auth state globally for the override to access
    (window as any).__clerkAuth = clerkAuth;
  }, [clerkAuth]);

  return <>{children}</>;
}