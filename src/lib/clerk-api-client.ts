/**
 * Clerk-aware API Client
 * Extends the base API client to automatically include Clerk authentication tokens
 */

import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { ApiClient } from './api-client';
import { useCallback, useEffect, useRef } from 'react';

// Singleton instance with Clerk token management
let clerkApiClient: ApiClient | null = null;
let currentToken: string | null = null;

/**
 * Hook to get an API client instance with Clerk authentication
 */
export function useClerkApiClient() {
  const clerkAuth = useClerkAuth();
  const getToken = clerkAuth?.getToken;
  const isLoaded = clerkAuth?.isLoaded;
  const isSignedIn = clerkAuth?.isSignedIn;
  const clientRef = useRef<ApiClient>(new ApiClient());

  // Initialize client if not already created
  if (!clientRef.current) {
    clientRef.current = new ApiClient();
    clerkApiClient = clientRef.current;
  }

  // Update authorization header when auth state changes
  const updateAuthHeader = useCallback(async () => {
    if (!isLoaded) return;

    try {
      if (isSignedIn && getToken) {
        const token = await getToken();
        if (token && token !== currentToken) {
          currentToken = token;
          // Override the getAuthHeaders method to include Clerk token
          const originalGetAuthHeaders = clientRef.current!['getAuthHeaders'].bind(clientRef.current);
          clientRef.current!['getAuthHeaders'] = function() {
            const headers = originalGetAuthHeaders();
            headers['Authorization'] = `Bearer ${currentToken}`;
            return headers;
          };
        }
      } else {
        currentToken = null;
        // Reset to original auth headers method
        if (clientRef.current) {
          const originalGetAuthHeaders = clientRef.current['getAuthHeaders'].bind(clientRef.current);
          clientRef.current['getAuthHeaders'] = originalGetAuthHeaders;
        }
      }
    } catch (error) {
      console.error('Failed to update auth header:', error);
    }
  }, [getToken, isLoaded, isSignedIn]);

  // Update auth header whenever auth state changes
  useEffect(() => {
    updateAuthHeader();
  }, [updateAuthHeader]);

  return clientRef.current;
}

/**
 * Get the global Clerk-aware API client instance
 * Note: This should only be used outside of React components
 * Inside components, use useClerkApiClient() hook instead
 */
export function getClerkApiClient(): ApiClient {
  if (!clerkApiClient) {
    clerkApiClient = new ApiClient();
  }
  return clerkApiClient;
}

/**
 * Update the global API client with a new Clerk token
 * This is useful for updating the token when it changes
 */
export async function updateClerkToken(token: string | null) {
  currentToken = token;
  const client = getClerkApiClient();
  
  if (token) {
    // Override the getAuthHeaders method to include Clerk token
    const originalGetAuthHeaders = client['getAuthHeaders'].bind(client);
    client['getAuthHeaders'] = function() {
      const headers = originalGetAuthHeaders();
      headers['Authorization'] = `Bearer ${currentToken}`;
      return headers;
    };
  } else {
    // Reset to original auth headers method
    const originalGetAuthHeaders = client['getAuthHeaders'].bind(client);
    client['getAuthHeaders'] = originalGetAuthHeaders;
  }
}
