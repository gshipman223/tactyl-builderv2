import { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import type { AuthUser, AuthSession } from '../api-types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth methods
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const clerk = useClerk();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // Convert Clerk user to our AuthUser format
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      setAuthUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        displayName: clerkUser.fullName || clerkUser.username || 'User',
        timezone: 'UTC',
        provider: 'clerk',
        emailVerified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
        createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
        avatarUrl: clerkUser.imageUrl,
      });
    } else {
      setAuthUser(null);
    }
  }, [clerkUser, isSignedIn]);

  // Get token when user signs in
  useEffect(() => {
    async function fetchToken() {
      if (isSignedIn) {
        try {
          const newToken = await getToken();
          setToken(newToken);
        } catch (err) {
          console.error('Failed to get token:', err);
          setError('Failed to authenticate');
        }
      } else {
        setToken(null);
      }
    }

    if (isLoaded) {
      fetchToken();
    }
  }, [isSignedIn, isLoaded, getToken]);

  const login = () => {
    clerk.openSignIn({});
  };

  const logout = async () => {
    try {
      await signOut();
      setAuthUser(null);
      setToken(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Failed to logout');
    }
  };

  const refreshUser = async () => {
    if (isSignedIn) {
      try {
        const newToken = await getToken({ skipCache: true });
        setToken(newToken);
      } catch (err) {
        console.error('Failed to refresh token:', err);
        setError('Failed to refresh authentication');
      }
    }
  };

  const clearError = () => setError(null);

  // Create a mock session for compatibility
  const session: AuthSession | null = authUser ? {
    userId: authUser.id,
    email: authUser.email,
    sessionId: `session_${authUser.id}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  } : null;

  const value: AuthContextType = {
    user: authUser,
    token,
    session,
    isAuthenticated: isSignedIn || false,
    isLoading: !isLoaded,
    error,
    login,
    logout,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within ClerkAuthProvider');
  }
  return context;
}
