import type { Request, Response } from "express";
import users, { type UserType } from "../models/User";
import { checkPassword, hashPassword, signToken } from "../services/auth";
import { handleError } from "../utils/handleError";

/**
 * Limite de tentativas: no máximo MAX_ATTEMPTS erros por IP a cada WINDOW_MS.
 * Protege contra alguém tentando adivinhar a senha por força bruta.
 * (Em memória: zera quando a API reinicia, o que é suficiente aqui.)
 */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; since: number }>();

const passwordMatches = async (
  user: UserType,
  password: string,
): Promise<boolean> => {
  if (user.passwordHash) {
    return checkPassword(password, user.passwordHash);
  }

  return user.password === password;
};

const tooManyAttempts = (ip: string): boolean => {
  const attemptsIp = attempts.get(ip);

  if (!attemptsIp || Date.now() - attemptsIp.since > WINDOW_MS) {
    return false;
  }

  return attemptsIp.count >= MAX_ATTEMPTS;
};

const registerFailure = (ip: string): void => {
  const attemptsIp = attempts.get(ip);
  if (!attemptsIp || Date.now() - attemptsIp.since > WINDOW_MS) {
    attempts.set(ip, { count: 1, since: Date.now() });
  } else {
    attemptsIp.count += 1;
  }
};

class AuthController {
  static login = async (req: Request, res: Response) => {
    try {
      const ip = req.ip ?? "?";

      if (tooManyAttempts(ip)) {
        res.status(429).json({
          message: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
        });

        return;
      }

      const username = String(req.body?.username ?? "")
        .trim()
        .toLowerCase();
      const password = String(req.body?.password ?? "");
      const user = username ? await users.findOne({ username }) : null;

      if (!user || !password || !(await passwordMatches(user, password))) {
        registerFailure(ip);
        res.status(401).json({ message: "Usuário ou senha incorretos." });

        return;
      }

      if (!user.passwordHash) {
        user.passwordHash = await hashPassword(password);
        user.password = undefined;

        await user.save();
      }

      attempts.delete(ip);

      const token = signToken({
        sub: user.id,
        username: user.username,
        name: user.name,
      });

      res.status(200).json({ token, user: user.toJSON() });
    } catch (error) {
      handleError(res, error, "Erro ao fazer login");
    }
  };

  static me = async (req: Request, res: Response) => {
    try {
      const user = await users.findById(req.user!.sub);

      if (!user) {
        res.status(401).json({ message: "Usuário não encontrado." });

        return;
      }

      res.status(200).json(user);
    } catch (error) {
      handleError(res, error, "Erro ao buscar usuário");
    }
  };
}

export default AuthController;
