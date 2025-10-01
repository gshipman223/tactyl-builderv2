/**
 * Authentication Routes - Simplified for Clerk
 */
import { ClerkAuthController } from '../controllers/auth/clerkController';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup authentication routes for Clerk integration
 */
export function setupAuthRoutes(app: Hono<AppEnv>): void {
    // Create a sub-router for auth routes
    const authRouter = new Hono<AppEnv>();
    
    // CSRF token endpoint (still needed for state-changing requests)
    authRouter.get('/csrf-token', setAuthLevel(AuthConfig.public), adaptController(ClerkAuthController, ClerkAuthController.getCsrfToken));
    
    // Check authentication status
    authRouter.get('/check', setAuthLevel(AuthConfig.public), adaptController(ClerkAuthController, ClerkAuthController.checkAuth));
    
    // Get user profile (from Clerk JWT)
    authRouter.get('/profile', setAuthLevel(AuthConfig.authenticated), adaptController(ClerkAuthController, ClerkAuthController.getProfile));
    
    // Clerk webhook endpoint for syncing user data
    authRouter.post('/webhook/clerk', setAuthLevel(AuthConfig.public), adaptController(ClerkAuthController, ClerkAuthController.handleClerkWebhook));
    
    // Mount the auth router under /api/auth
    app.route('/api/auth', authRouter);
}
