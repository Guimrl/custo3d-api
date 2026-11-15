import type { Response } from "express";
import mongoose from "mongoose";

export function handleError(
  res: Response,
  error: unknown,
  context: string,
): void {
  if (error instanceof mongoose.Error.CastError) {
    const message =
      error.path === "_id"
        ? "Id inválido."
        : `Valor inválido para "${error.path}".`;
    res.status(400).json({ message });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors)
      .map((item) => item.message)
      .join(" ");
    res.status(400).json({ message: `Dados inválidos. ${details}` });
    return;
  }

  console.error(error);
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ message: `${context}: ${message}` });
}
