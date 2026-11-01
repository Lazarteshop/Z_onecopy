import type { Request, Response } from 'express';
import { app } from '../server.ts';

/**
 * Z-ONEAPP 鈥� VERCEL SERVERLESS STAGING PROTOTYPE (READ-ONLY HARDENED)
 *
 * Enforces strict staging isolation:
 * 1. Read-Only execution for all application and financial data.
 * 2. All POST, PUT, DELETE, and PATCH mutations (including /api/auth/login) are blocked with HTTP 403.
 * 3. Zero writes to shared production Firestore.
 * 4. Never treats /tmp as persistent or authoritative storage.
 * 5. Bypasses persistent server loops (server.listen, setInterval).
 * 6. Intercepts unmatched API routes to ensure structured JSON 404 responses instead of SPA HTML fallback.
 * 7. Informs clients that WebSocket/live-chat services are unavailable because Render is suspended.
 */

const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export default async function handler(req: Request, res: Response) {
  // Ensure all responses from this gateway carry staging headers
  res.setHeader('X-Zone-Deployment', 'vercel-staging-prototype');
  res.setHeader('X-Zone-Mode', 'read-only');

  const path = (req.url || '').split('?')[0];
  const method = (req.method || 'GET').toUpperCase();

  // 1. Gateway root endpoint (/api)
  if (path === '/api' || path === '/api/') {
    return res.status(200).json({
      status: 'ok',
      service: 'Z-oneApp API Gateway',
      deployment: 'vercel-staging-prototype',
      mode: 'read-only',
      message: 'Vercel read-only staging prototype active. Data mutations and persistent services are coordinated by the primary Render server.'
    });
  }

  // 2. Accurate WebSocket advisory (Render is suspended)
  if (path.startsWith('/api/chat/ws') || req.headers['upgrade'] === 'websocket') {
    return res.status(501).json({
      error: 'Live chat and WebSocket protocols are currently unavailable. The primary Render service hosting WebSocket connections is currently suspended.',
      code: 'WEBSOCKET_SERVICE_UNAVAILABLE',
      serviceStatus: 'suspended',
      host: 'z-oneapp.onrender.com'
    });
  }

  // 3. Strict Mutation & Login Lock (All POST, PUT, DELETE, PATCH including /api/auth/login)
  if (MUTATION_METHODS.has(method)) {
    return res.status(403).json({
      error: 'Vercel Staging Environment is currently in READ-ONLY mode. Logins, financial transactions, uploads, and all data mutations are blocked in staging to protect authoritative production state.',
      code: 'STAGING_MUTATION_LOCKED',
      readOnly: true,
      requestedMethod: method,
      requestedPath: path,
      authoritativeHost: 'https://z-oneapp.onrender.com'
    });
  }

  // 4. Wrap response headers and end method to prevent Express SPA HTML fallback on unmatched API routes
  const originalSetHeader = res.setHeader.bind(res);
  let isHtmlCaptured = false;

  res.setHeader = function (name: string, value: any) {
    if (path.startsWith('/api') && String(name).toLowerCase() === 'content-type' && String(value).includes('text/html')) {
      isHtmlCaptured = true;
      res.statusCode = 404;
      res.removeHeader('content-length');
      return originalSetHeader('Content-Type', 'application/json; charset=utf-8');
    }
    return originalSetHeader(name, value);
  };

  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, ...args: any[]) {
    if (isHtmlCaptured && path.startsWith('/api')) {
      res.removeHeader('content-length');
      const jsonPayload = JSON.stringify({
        error: `API endpoint '${path}' not found`,
        code: 'API_NOT_FOUND',
        path,
        method
      });
      res.setHeader('Content-Length', Buffer.byteLength(jsonPayload));
      return originalEnd(jsonPayload, 'utf-8');
    }
    return originalEnd(chunk, ...args as [any, any]);
  };

  // 5. Delegate allowed read-only GET/HEAD/OPTIONS requests to Express app
  return app(req, res);
}
