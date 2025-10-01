import { Outlet } from 'react-router';
import { AuthProvider } from './contexts/auth-context';
import { ThemeProvider } from './contexts/theme-context';
import { Toaster } from './components/ui/sonner';
import { AppLayout } from './components/layout/app-layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ClerkProvider } from '@clerk/clerk-react';
import { ApiClientProvider } from './providers/api-client-provider';

// Use Clerk if publishable key is available
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function App() {
  if (clerkPubKey) {
    return (
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkPubKey}>
          <ThemeProvider>
            <AuthProvider>
              <ApiClientProvider>
                <AppLayout>
                  <Outlet />
                </AppLayout>
                <Toaster richColors position="top-right" />
              </ApiClientProvider>
            </AuthProvider>
          </ThemeProvider>
        </ClerkProvider>
      </ErrorBoundary>
    );
  }

  // Without Clerk, no need for ApiClientProvider
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppLayout>
            <Outlet />
          </AppLayout>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}