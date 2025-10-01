/**
 * Hook to get an API client with Clerk authentication
 * Since ApiClientProvider handles the authentication, this just returns the global apiClient
 */

import { apiClient } from './api-client';

export function useApiClient() {
  // The global apiClient is already enhanced with Clerk auth by ApiClientProvider
  return apiClient;
}

// Export for non-hook usage (e.g., in event handlers)
export function getApiClient() {
  return apiClient;
}
