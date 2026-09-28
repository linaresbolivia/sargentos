import { Request, Response, NextFunction } from 'express';
import { JwtTokenService } from '../services/JwtTokenService';
import { TokenPayload } from '../../application/ports/ITokenService';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const tokenService = new JwtTokenService();

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'No autorizado. Token de acceso no proporcionado.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = tokenService.verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      message: 'No autorizado. Token de acceso inválido o expirado.',
    });
    return;
  }

  req.user = payload;
  next();
};

export const authorize = (allowedRoles: string[] = [], requiredPermissions: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'No autorizado.',
      });
      return;
    }

    // Role check: Super Admin always has access to everything
    if (user.roles.includes('SUPER_ADMIN')) {
      next();
      return;
    }

    // If roles are specified, check if user has at least one of them
    if (allowedRoles.length > 0) {
      const hasRole = user.roles.some((r) => allowedRoles.includes(r));
      if (hasRole) {
        next();
        return;
      }
    }

    // If permissions are specified, check if user has all of them
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((p) =>
        user.permissions.includes(p)
      );
      if (hasAllPermissions) {
        next();
        return;
      }
    }

    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Permisos insuficientes.',
    });
  };
};
