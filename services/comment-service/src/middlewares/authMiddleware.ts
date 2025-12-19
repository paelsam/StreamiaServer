import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, error: 'Unauthorized - No token provided' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; username: string };
    req.userId = decoded.userId;
    req.username = decoded.username;

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized - Invalid token' });
  }
}
