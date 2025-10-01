/**
 * Clerk Authentication Controller
 * Handles authentication endpoints for Clerk integration
 */

import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { CsrfService } from '../../../services/csrf/CsrfService';
import { createLogger } from '../../../logger';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/backend';

const logger = createLogger('ClerkAuthController');

export class ClerkAuthController extends BaseController {
    /**
     * Get CSRF token for state-changing requests
     */
    static getCsrfToken = async (
        _request: Request,
        _env: Env,
        _ctx: ExecutionContext,
        _context: RouteContext
    ): Promise<Response> => {
        const token = CsrfService.generateToken();
        
        // Create the CSRF cookie directly
        const { createSecureCookie } = await import('../../../utils/authUtils');
        const cookie = createSecureCookie({
            name: 'csrf-token', // Match the name expected by CsrfService
            value: token,
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: '/',
            maxAge: 7200
        });
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                token,
                expiresIn: 7200 // 2 hours
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': cookie
            }
        });
    };

    /**
     * Check authentication status
     */
    static checkAuth = async (
        _request: Request,
        _env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<Response> => {
        const user = context.user;
        
        if (!user) {
            return new Response(JSON.stringify({
                success: false,
                error: {
                    code: 401,
                    message: 'Not authenticated',
                    type: 'authentication'
                }
            }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                authenticated: true,
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName,
                    provider: user.provider,
                    emailVerified: user.emailVerified,
                    avatarUrl: user.avatarUrl
                }
            }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    /**
     * Get user profile from Clerk JWT
     */
    static getProfile = async (
        _request: Request,
        _env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<Response> => {
        const user = context.user;
        
        if (!user) {
            return new Response(JSON.stringify({
                success: false,
                error: {
                    code: 401,
                    message: 'Not authenticated',
                    type: 'authentication'
                }
            }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName,
                    timezone: user.timezone || 'UTC',
                    provider: user.provider,
                    emailVerified: user.emailVerified,
                    createdAt: user.createdAt,
                    avatarUrl: user.avatarUrl,
                    metadata: {
                        byokEnabled: false,
                        githubAccessToken: null
                    }
                }
            }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    /**
     * Handle Clerk webhook events for user synchronization
     */
    static handleClerkWebhook = async (
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        _context: RouteContext
    ): Promise<Response> => {
        if (!env.CLERK_WEBHOOK_SECRET) {
            logger.error('Clerk webhook secret not configured');
            return new Response(JSON.stringify({
                success: false,
                error: {
                    code: 500,
                    message: 'Webhook not configured',
                    type: 'configuration'
                }
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        try {
            const payload = await request.text();
            const headers = {
                'svix-id': request.headers.get('svix-id') || '',
                'svix-timestamp': request.headers.get('svix-timestamp') || '',
                'svix-signature': request.headers.get('svix-signature') || '',
            };

            // Verify the webhook signature
            const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
            const evt = wh.verify(payload, headers) as WebhookEvent;

            // Handle different event types
            switch (evt.type) {
                case 'user.created':
                case 'user.updated':
                    logger.info(`Clerk webhook: ${evt.type}`, { userId: evt.data.id });
                    // You can sync user data to your database here if needed
                    break;
                    
                case 'user.deleted':
                    logger.info('Clerk webhook: user.deleted', { userId: evt.data.id });
                    // Handle user deletion if needed
                    break;
                    
                default:
                    logger.debug(`Unhandled Clerk webhook event: ${evt.type}`);
            }

            return new Response(JSON.stringify({ success: true }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        } catch (error) {
            logger.error('Failed to process Clerk webhook:', error);
            return new Response(JSON.stringify({
                success: false,
                error: {
                    code: 400,
                    message: 'Invalid webhook payload',
                    type: 'validation'
                }
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    };
}