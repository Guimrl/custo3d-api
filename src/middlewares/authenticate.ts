import type { NextFunction, Request, Response } from "express";
import { verifyToken, type TokenPayload } from "../services/auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: TokenPayload;
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ message: "Faça login para continuar." });
    return;
  }
  req.user = user;
  next();
}
