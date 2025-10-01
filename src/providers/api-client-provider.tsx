/**
 * API Client Provider
 * Ensures the global apiClient has Clerk authentication
 */

import { useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { apiClient } from '@/lib/api-client';

interface ApiClientProviderProps {
  children: React.ReactNode;
}

export function ApiClientProvider({ children }: ApiClientProviderProps) {
  const clerkAuth = useClerkAuth();

  useEffect(() => {
    if (!clerkAuth?.isLoaded) return;

    // Store the Clerk getToken function on the apiClient
    if (clerkAuth.isSignedIn && clerkAuth.getToken) {
      (apiClient as any).__clerkGetToken = clerkAuth.getToken;
    } else {
      (apiClient as any).__clerkGetToken = null;
    }

    // Override the requestRaw method to inject Clerk token
    const originalRequestRaw = (apiClient as any).requestRaw.bind(apiClient);
    (apiClient as any).requestRaw = async function(...args: any[]) {
      const [endpoint, options = {}, isRetry, noToast] = args;
      
      // Get fresh token for each request
      const getToken = (apiClient as any).__clerkGetToken;
      if (getToken) {
        try {
          const token = await getToken();
          if (token) {
            // Ensure headers object exists
            if (!options.headers) {
              options.headers = {};
            }
            options.headers['Authorization'] = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Failed to get Clerk token:', error);
        }
      }
      
      return originalRequestRaw(endpoint, options, isRetry, noToast);
    };
  }, [clerkAuth?.isLoaded, clerkAuth?.isSignedIn, clerkAuth?.getToken]);

  return <>{children}</>;
}
