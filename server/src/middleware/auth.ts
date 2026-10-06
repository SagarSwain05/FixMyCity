import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";
import { env } from "../config/env";
import { Role } from "../constants";

export interface JWTPayload {
  sub: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export function generateToken(user: IUser): string {
  const payload: JWTPayload = { sub: user._id.toString(), role: user.role };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

async function resolveUser(req: Request): Promise<IUser | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const decoded = jwt.verify(header.substring(7), env.jwtSecret) as JWTPayload;
  const user = await User.findById(decoded.sub);
  if (!user || !user.isActive) return null;
  return user;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    next(error);
  }
}

// Attaches req.user when a valid token is present, but never rejects the request.
export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    req.user = (await resolveUser(req)) || undefined;
  } catch {
    req.user = undefined;
  }
  next();
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: `Access denied. Requires role: ${roles.join(" or ")}` });
    }
    next();
  };
}
