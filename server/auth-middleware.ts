import { Request, Response, NextFunction } from 'express';
import { AuthService } from './firebase-service';
import { UserProfile } from '../shared/schema';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
      decodedToken?: any;
    }
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No valid authentication token provided'
      });
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the Firebase ID token
    const decodedToken = await AuthService.verifyIdToken(idToken);
    
    // Get user profile from Firestore
    const userProfile = await AuthService.getUserProfile(decodedToken.uid);
    
    if (!userProfile) {
      return res.status(401).json({
        success: false,
        error: 'User profile not found'
      });
    }

    // Attach user info to request
    req.user = userProfile;
    req.decodedToken = decodedToken;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireManagerAccess = requireRole(['admin', 'area-manager']);
export const requireApiAccess = requireRole(['admin', 'area-manager', 'api-user']);