import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Button } from '../ui/button';

export function ClerkAuthButton() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
              userButtonTrigger: "focus:shadow-none"
            }
          }}
          afterSignOutUrl="/"
        />
      </SignedIn>
    </>
  );
}
