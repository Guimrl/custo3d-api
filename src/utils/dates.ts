import { BadRequestError } from "./handleError";

/**
 * Converte o que vem do front em Date.
 * - vazio (undefined, null, "") → null;
 * - "2026-11-25" ou ISO completo → Date;
 * - texto que não é data → erro 400, em vez de gravar uma data inválida.
 */
export const parseDate = (value: unknown, fieldLabel = "Data"): Date | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${fieldLabel} inválida.`);
  }

  return date;
};
