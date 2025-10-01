import { verifyToken } from '@clerk/backend';
import { createLogger } from '../../logger';
import type { AuthUser } from '../../types/auth-types';

const logger = createLogger('ClerkAuth');

export interface ClerkJWTClaims {
  azp: string;
  exp: number;
  iat: number;
  iss: string;
  nbf: number;
  sid: string;
  sub: string; // User ID
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  username?: string;
  image_url?: string;
}

export async function verifyClerkToken(token: string, env: Env): Promise<AuthUser | null> {
  try {
    // If auth is disabled, return a mock user
    if (env.DISABLE_AUTH === 'true') {
      return {
        id: 'anonymous',
        email: 'anonymous@tactyl.co',
        displayName: 'Anonymous User',
        timezone: 'UTC',
        provider: 'anonymous',
        emailVerified: true,
        createdAt: new Date(),
      };
    }

    // If no Clerk secret key, disable auth
    if (!env.CLERK_SECRET_KEY) {
      logger.warn('Clerk secret key not configured, authentication disabled');
      return {
        id: 'anonymous',
        email: 'anonymous@tactyl.co',
        displayName: 'Anonymous User',
        timezone: 'UTC',
        provider: 'anonymous',
        emailVerified: true,
        createdAt: new Date(),
      };
    }

    // Verify the token with Clerk
    const verified = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });

    if (!verified) {
      logger.error('Token verification failed');
      return null;
    }

    const claims = verified as unknown as ClerkJWTClaims;

    // Convert Clerk claims to AuthUser
    const user: AuthUser = {
      id: claims.sub,
      email: claims.email || `${claims.sub}@clerk.user`,
      displayName: claims.name || claims.username || claims.email || 'Clerk User',
      timezone: 'UTC',
      provider: 'clerk',
      emailVerified: claims.email_verified || false,
      createdAt: new Date(claims.iat * 1000),
      avatarUrl: claims.image_url,
    };

    logger.info('Successfully verified Clerk token for user:', user.id);
    return user;
  } catch (error) {
    logger.error('Failed to verify Clerk token:', error);
    return null;
  }
}

export async function extractClerkUser(request: Request, env: Env): Promise<AuthUser | null> {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyClerkToken(token, env);
  }

  // Check for __clerk_db_jwt cookie (Clerk's default cookie name)
  const cookies = request.headers.get('Cookie');
  if (cookies) {
    const clerkCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('__clerk_db_jwt='));
    
    if (clerkCookie) {
      const token = clerkCookie.split('=')[1];
      return verifyClerkToken(token, env);
    }
  }

  // If auth is disabled, return anonymous user
  if (env.DISABLE_AUTH === 'true' || !env.CLERK_SECRET_KEY) {
    return {
      id: 'anonymous',
      email: 'anonymous@tactyl.co',
      displayName: 'Anonymous User',
      timezone: 'UTC',
      provider: 'anonymous',
      emailVerified: true,
      createdAt: new Date(),
    };
  }

  return null;
}
