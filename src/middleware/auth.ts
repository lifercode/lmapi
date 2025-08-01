import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { User } from '@/models/User';
import { logger } from '@/server';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
      return;
    }

    const decoded = verifyToken(token);
    
    // Verify user still exists
    const user = await User.findById(decoded.userId).select('_id name email');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    req.user = {
      id: (user._id as any).toString(),
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('_id name email');
      
      if (user) {
        req.user = {
          id: (user._id as any).toString(),
          email: user.email,
          name: user.name
        };
      }
    }

    next();
  } catch (error) {
    // Optional auth - continue even if token is invalid
    next();
  }
}; 