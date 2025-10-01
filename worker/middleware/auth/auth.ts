/**
 * Authentication Middleware
 * Handles Clerk JWT validation and session management
 */

import { AuthUserSession } from '../../types/auth-types';
import { createLogger } from '../../logger';
import { extractClerkUser } from './clerkAuth';
import type { AuthSession } from '../../types/auth-types';

const logger = createLogger('AuthMiddleware');

/**
 * Authentication middleware using Clerk
 */
export async function authMiddleware(
    request: Request,
    env: Env
): Promise<AuthUserSession | null> {
    try {
        // Use Clerk authentication
        const user = await extractClerkUser(request, env);
        
        if (user) {
            logger.debug('User authenticated via Clerk', { userId: user.id });
            
            // Create a session object for compatibility
            const session: AuthSession = {
                userId: user.id,
                email: user.email,
                sessionId: `session_${user.id}`,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            };
            
            return { user, sessionId: session.sessionId };
        }
        
        logger.debug('No authentication found');
        return null;
    } catch (error) {
        logger.error('Auth middleware error', error);
        return null;
    }
}

// Keep validateToken for backward compatibility
export async function validateToken(
    _token: string,
    _env: Env
): Promise<AuthUserSession | null> {
    logger.warn('validateToken called - this is deprecated, use Clerk authentication');
    return null;
}