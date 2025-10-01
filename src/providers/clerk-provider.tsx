import { ClerkProvider } from '@clerk/clerk-react';
import { ReactNode } from 'react';

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface ClerkAuthProviderProps {
  children: ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  
  if (!clerkPubKey) {
    console.warn('Clerk publishable key not found. Authentication will be disabled.');
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={{
        elements: {
          formButtonPrimary: 'bg-orange-500 hover:bg-orange-600',
          card: 'shadow-xl',
        },
        variables: {
          colorPrimary: '#f97316', // Tactyl orange
          colorBackground: '#ffffff',
          colorText: '#000000',
          colorInputBackground: '#f3f4f6',
          colorInputText: '#000000',
          borderRadius: '0.5rem',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
