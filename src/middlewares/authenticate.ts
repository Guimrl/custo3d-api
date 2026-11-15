import type { NextFunction, Request, Response } from "express";
import { verifyToken, type TokenPayload } from "../services/auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: TokenPayload;
  }
}

const BEARER_PREFIX = "Bearer ";

/**
 * Exige "Authorization: Bearer <token>" válido. Registrado em routes/index.ts:
 * toda rota registrada depois dele fica protegida.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : "";
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ message: "Faça login para continuar." });

    return;
  }

  req.user = user;
  next();
}
