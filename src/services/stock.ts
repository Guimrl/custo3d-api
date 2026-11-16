import type { Types } from "mongoose";
import spools from "../models/Spools";
import supplies from "../models/Supply";

type Id = Types.ObjectId | string | null | undefined;

interface StockItems {
  filaments: { spoolId?: Id; label?: string; grams: number }[];
  supplies: { supplyId?: Id; label?: string; qty: number }[];
}

/**
 * Aplica a baixa (-1) ou o estorno (+1).
 * @returns Avisos legíveis (ex.: "o carretel ficou zerado"), mostrar no front.
 */
export async function applyStock(
  items: StockItems,
  sign: 1 | -1,
): Promise<string[]> {
  const filamentWarnings = await Promise.all(
    items.filaments.map(async (filament) => {
      if (!filament.spoolId || !filament.grams) {
        return [];
      }

      const warnings: string[] = [];
      if (sign < 0) {
        const spool = await spools.findById(filament.spoolId);
        if (!spool) {
          warnings.push(`Carretel "${filament.label}" não existe mais.`);
        } else if (spool.remainingGrams < filament.grams) {
          warnings.push(
            `Carretel "${filament.label}" tinha só ${spool.remainingGrams} g (usado ${filament.grams} g). Ficou zerado.`,
          );
        }
      }

      await spools.updateOne({ _id: filament.spoolId }, [
        {
          $set: {
            remainingGrams: {
              $max: [0, { $add: ["$remainingGrams", sign * filament.grams] }],
            },
          },
        },
      ]);

      return warnings;
    }),
  );

  const supplyWarnings = await Promise.all(
    items.supplies.map(async (supp) => {
      if (!supp.supplyId || !supp.qty) {
        return [];
      }

      const warnings: string[] = [];
      if (sign < 0) {
        const supply = await supplies.findById(supp.supplyId);
        if (!supply) {
          warnings.push(`Material "${supp.label}" não existe mais.`);
        } else if (supply.quantityRemaining < supp.qty) {
          warnings.push(
            `Material "${supp.label}" tinha só ${supply.quantityRemaining} ${supply.unit}. Ficou zerado.`,
          );
        }
      }

      await supplies.updateOne({ _id: supp.supplyId }, [
        {
          $set: {
            quantityRemaining: {
              $max: [0, { $add: ["$quantityRemaining", sign * supp.qty] }],
            },
          },
        },
      ]);

      return warnings;
    }),
  );

  return [...filamentWarnings.flat(), ...supplyWarnings.flat()];
}
