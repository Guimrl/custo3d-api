import type { Response } from "express";
import lodash from "lodash";
import mongoose from "mongoose";

/** Campos de controle que o front devolve, mas que nunca devem ser regravados. */
const META_FIELDS = ["id", "_id", "createdAt", "updatedAt"];

/** Corpo da requisição sem id e datas, pronto para gravar. */
export const withoutMetaFields = (body: unknown): Record<string, unknown> =>
  lodash.omit(
    lodash.isPlainObject(body) ? (body as Record<string, unknown>) : {},
    META_FIELDS,
  );

/** Registro buscado por id não existe (responde 404). */
export class NotFoundError extends Error {
  constructor(message = "Registro não encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Dados recusados com mensagem própria (responde 400). */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

/** Serviço externo (ex.: ImgBB) recusou ou falhou (responde 502). */
export class ExternalServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalServiceError";
  }
}

/** Erro 11000 do MongoDB: violou um índice unique. */
export const isDuplicateKeyError = (error: unknown): boolean =>
  (error as { code?: number })?.code === 11000;

/**
 * Traduz o erro capturado no catch para o status HTTP certo.
 * Responde sempre no formato `{ "message": "..." }`.
 */
export const handleError = (
  res: Response,
  error: unknown,
  context: string,
): void => {
  if (error instanceof NotFoundError) {
    res.status(404).json({ message: error.message });

    return;
  }

  if (error instanceof BadRequestError) {
    res.status(400).json({ message: error.message });

    return;
  }

  if (error instanceof ExternalServiceError) {
    res.status(502).json({ message: error.message });

    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    const message =
      error.path === "_id"
        ? "Id inválido."
        : `Valor inválido para "${error.path}".`;
    res.status(400).json({ message });

    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details = lodash.map(error.errors, "message").join(" ");
    res.status(400).json({ message: `Dados inválidos. ${details}` });

    return;
  }

  console.error(error);
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ message: `${context}: ${message}` });
};
