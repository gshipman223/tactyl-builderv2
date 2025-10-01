import { Outlet } from 'react-router';
import { ClerkAuthProvider } from './contexts/clerk-auth-context';
import { MockAuthProvider } from './contexts/mock-auth-context';
import { ThemeProvider } from './contexts/theme-context';
import { Toaster } from './components/ui/sonner';
import { AppLayout } from './components/layout/app-layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ClerkProvider } from '@clerk/clerk-react';

// Use Clerk if publishable key is available, otherwise use mock auth
const useClerkAuth = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function App() {
  if (useClerkAuth) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
            <ClerkAuthProvider>
              <AppLayout>
                <Outlet />
              </AppLayout>
              <Toaster richColors position="top-right" />
            </ClerkAuthProvider>
          </ClerkProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Fallback to mock auth (anonymous user)
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MockAuthProvider>
          <AppLayout>
            <Outlet />
          </AppLayout>
          <Toaster richColors position="top-right" />
        </MockAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}