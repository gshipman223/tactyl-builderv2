import { createContext, useContext, useState } from 'react';
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

// Create a mock user for development/anonymous access
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
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
};

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [intendedUrl, setIntendedUrl] = useState<string | null>(null);

  const value: AuthContextType = {
    user: mockUser,
    token: 'anonymous-token',
    session: mockSession,
    isAuthenticated: true, // Always authenticated with mock user
    isLoading: false,
    error: null,
    authProviders: {
      google: false,
      github: false,
      email: false,
    },
    hasOAuth: false,
    requiresEmailAuth: false,
    login: () => {
      console.log('Mock login - no authentication required');
    },
    loginWithEmail: async () => {
      console.log('Mock email login - no authentication required');
    },
    register: async () => {
      console.log('Mock register - no authentication required');
    },
    logout: async () => {
      console.log('Mock logout - no authentication required');
    },
    refreshUser: async () => {
      console.log('Mock refresh - no authentication required');
    },
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
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
