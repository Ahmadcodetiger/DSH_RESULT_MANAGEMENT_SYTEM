import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'ADMIN' | 'TEACHER' | 'PARENT' | 'ACCOUNTANT' | 'DIRECTOR';
    admissionNumber?: string; // For parents
    name?: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Fallback to query parameter token (commonly used for PDF download/file links)
  if (!token && req.query.token) {
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: Array<'ADMIN' | 'TEACHER' | 'PARENT' | 'ACCOUNTANT' | 'DIRECTOR'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access: insufficient permissions' });
    }
    next();
  };
};
