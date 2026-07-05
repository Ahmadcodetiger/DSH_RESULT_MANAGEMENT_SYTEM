import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant';
import { ITenant } from '../models/Tenant';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'PARENT' | 'ACCOUNTANT' | 'DIRECTOR';

export interface AuthRequest extends Request {
  tenantId?: string;
  tenant?: ITenant;
  user?: {
    id: string;
    role: Role;
    tenantId: string;
    admissionNumber?: string; // For parents
    name?: string;
  };
}

/**
 * JWT Authentication Middleware
 * 
 * Verifies the JWT token from Authorization header or query parameter.
 * Extracts user identity and tenant context from the token payload.
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  const allowQueryToken = process.env.ALLOW_QUERY_TOKEN === 'true' ||
    (req.method === 'GET' && typeof req.path === 'string' && req.path.includes('/pdf'));

  // Fallback to query parameter token (commonly used for PDF download/file links)
  if (!token && allowQueryToken && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
    }
    const decoded = jwt.verify(token, secret) as any;
    
    req.user = {
      id: decoded.id,
      role: decoded.role,
      tenantId: decoded.tenantId || '',
      admissionNumber: decoded.admissionNumber,
      name: decoded.name,
    };

    // If the token carries a tenantId and the request doesn't have one yet
    // (e.g., API client without subdomain), set it from the token.
    if (decoded.tenantId && !req.tenantId) {
      req.tenantId = decoded.tenantId;
    }

    // If tenant context has not been resolved from host/header, hydrate it from token.
    if (decoded.tenantId && !req.tenant) {
      const tenant = await Tenant.findById(decoded.tenantId);
      if (tenant) {
        req.tenant = tenant;
      }
    }

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Role-Based Access Control Middleware
 * 
 * Restricts access to routes based on user role.
 */
export const requireRole = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access: insufficient permissions' });
    }
    next();
  };
};

/**
 * Tenant Consistency Guard
 * 
 * Ensures that the authenticated user belongs to the same tenant
 * as the one resolved from the subdomain/domain/header.
 * SUPER_ADMIN users are exempt (they can access any tenant).
 */
export const tenantGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Super admins can access any tenant
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  // If both tenant contexts exist, they must match
  if (req.tenantId && req.user?.tenantId && req.tenantId !== req.user.tenantId) {
    return res.status(403).json({
      message: 'Access denied: Your account does not belong to this school.',
    });
  }

  // If request has tenant but user doesn't (shouldn't happen with proper JWT)
  if (req.tenantId && req.user && !req.user.tenantId) {
    // Set the user's tenant from the request context
    req.user.tenantId = req.tenantId;
  }

  next();
};
