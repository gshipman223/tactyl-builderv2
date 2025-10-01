/**
 * Auth Modal Provider - Simplified for Clerk
 * Provides global authentication modal management using Clerk's built-in UI
 */

import React, { createContext, useContext, useCallback } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { setGlobalAuthModalTrigger } from '../../lib/api-client';

interface AuthModalContextType {
  showAuthModal: (context?: string, onSuccess?: () => void, intendedUrl?: string) => void;
  hideAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}

interface AuthModalProviderProps {
  children: React.ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const clerk = useClerk();

  const showAuthModal = useCallback((_context?: string, onSuccess?: () => void, intendedUrl?: string) => {
    // If Clerk is available, use its built-in modal
    if (clerk) {
      clerk.openSignIn({
        afterSignInUrl: intendedUrl || window.location.href,
      });
      
      // Handle success callback if provided
      if (onSuccess) {
        // Listen for sign in completion
        const checkAuth = setInterval(() => {
          if (clerk.user) {
            clearInterval(checkAuth);
            onSuccess();
          }
        }, 500);
        
        // Clean up after 30 seconds
        setTimeout(() => clearInterval(checkAuth), 30000);
      }
    } else {
      console.log('Auth modal requested but Clerk is not available');
    }
  }, [clerk]);

  const hideAuthModal = useCallback(() => {
    if (clerk) {
      clerk.closeSignIn();
    }
  }, [clerk]);

  // Set up global trigger
  React.useEffect(() => {
    setGlobalAuthModalTrigger(showAuthModal);
  }, [showAuthModal]);

  return (
    <AuthModalContext.Provider value={{ showAuthModal, hideAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}