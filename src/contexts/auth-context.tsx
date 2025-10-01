/**
 * Auth Context Compatibility Layer
 * This file provides backward compatibility for components still using the old auth context
 * It wraps Clerk authentication to provide the same interface
 */

import { createContext, useContext, useCallback, useState } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import type { AuthUser, AuthSession } from '../api-types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth provider configuration
  authProviders: {
    google: boolean;
    github: boolean;
    email: boolean;
  } | null;
  hasOAuth: boolean;
  requiresEmailAuth: boolean;
  
  // OAuth login method with redirect support
  login: (provider: 'google' | 'github', redirectUrl?: string) => void;
  
  // Email/password login method
  loginWithEmail: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; name?: string }) => Promise<void>;
  
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  
  // Redirect URL management
  setIntendedUrl: (url: string) => void;
  getIntendedUrl: () => string | null;
  clearIntendedUrl: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if Clerk is available
const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!hasClerk) {
    // Use mock auth if Clerk is not configured
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
  
  // Use Clerk auth
  return <ClerkAuthWrapper>{children}</ClerkAuthWrapper>;
}

function ClerkAuthWrapper({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const clerk = useClerk();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intendedUrl, setIntendedUrl] = useState<string | null>(null);

  // Convert Clerk user to AuthUser
  const user: AuthUser | null = clerkUser && isSignedIn ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    displayName: clerkUser.fullName || clerkUser.username || 'User',
    timezone: 'UTC',
    provider: 'clerk',
    emailVerified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
    createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
    avatarUrl: clerkUser.imageUrl,
  } : null;

  // Create session for compatibility
  const session: AuthSession | null = user ? {
    userId: user.id,
    email: user.email,
    sessionId: `session_${user.id}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  } : null;

  const login = useCallback((_provider: 'google' | 'github', redirectUrl?: string) => {
    if (redirectUrl) setIntendedUrl(redirectUrl);
    clerk.openSignIn({});
  }, [clerk]);

  const loginWithEmail = useCallback(async (_credentials: { email: string; password: string }) => {
    clerk.openSignIn({});
  }, [clerk]);

  const register = useCallback(async (_data: { email: string; password: string; name?: string }) => {
    clerk.openSignUp({});
  }, [clerk]);

  const logout = useCallback(async () => {
    try {
      await signOut();
      setToken(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Failed to logout');
    }
  }, [signOut]);

  const refreshUser = useCallback(async () => {
    if (isSignedIn && getToken) {
      try {
        const newToken = await getToken({ skipCache: true });
        setToken(newToken);
      } catch (err) {
        console.error('Failed to refresh token:', err);
        setError('Failed to refresh authentication');
      }
    }
  }, [isSignedIn, getToken]);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    user,
    token,
    session,
    isAuthenticated: isSignedIn || false,
    isLoading: !isLoaded,
    error,
    authProviders: {
      google: true,
      github: true,
      email: true,
    },
    hasOAuth: true,
    requiresEmailAuth: false,
    login,
    loginWithEmail,
    register,
    logout,
    refreshUser,
    clearError,
    setIntendedUrl,
    getIntendedUrl: () => intendedUrl,
    clearIntendedUrl: () => setIntendedUrl(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Mock auth provider for when Clerk is not configured
function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [intendedUrl, setIntendedUrl] = useState<string | null>(null);
  
  const mockUser: AuthUser = {
    id: 'anonymous-user',
    email: 'anonymous@tactyl.co',
    displayName: 'Anonymous User',
    timezone: 'UTC',
    provider: 'anonymous',
    emailVerified: true,
    createdAt: new Date(),
  };

  const mockSession: AuthSession = {
    userId: 'anonymous-user',
    email: 'anonymous@tactyl.co',
    sessionId: 'anonymous-session',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };

  const value: AuthContextType = {
    user: mockUser,
    token: 'anonymous-token',
    session: mockSession,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    authProviders: {
      google: false,
      github: false,
      email: false,
    },
    hasOAuth: false,
    requiresEmailAuth: false,
    login: () => console.log('Mock login'),
    loginWithEmail: async () => console.log('Mock email login'),
    register: async () => console.log('Mock register'),
    logout: async () => console.log('Mock logout'),
    refreshUser: async () => console.log('Mock refresh'),
    clearError: () => {},
    setIntendedUrl,
    getIntendedUrl: () => intendedUrl,
    clearIntendedUrl: () => setIntendedUrl(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export for components that might be checking authentication state
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}