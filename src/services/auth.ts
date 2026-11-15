import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;

export interface TokenPayload {
  sub: string;
  username: string;
  name: string;
}

const secret = (): string => {
  const secretEnv = process.env.JWT_SECRET;

  if (!secretEnv || secretEnv.length < 16) {
    throw new Error("Defina JWT_SECRET no .env ");
  }
  return secretEnv;
};

export const hashPassword = (password: string) =>
  bcrypt.hash(password, SALT_ROUNDS);

export const checkPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, secret(), { expiresIn: "7d" });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, secret()) as TokenPayload;
  } catch {
    return null;
  }
};
