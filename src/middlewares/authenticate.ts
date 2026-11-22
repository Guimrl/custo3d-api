import type { NextFunction, Request, Response } from "express";
import { verifyToken, type TokenPayload } from "../services/auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: TokenPayload;
  }
}

const BEARER_PREFIX = "Bearer ";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith(BEARER_PREFIX)
    ? header.slice(BEARER_PREFIX.length)
    : "";
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ message: "Faça login para continuar." });

    return;
  }

  req.user = user;
  next();
};
