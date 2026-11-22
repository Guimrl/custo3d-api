import type { Types } from "mongoose";
import spools from "../models/Spools";
import supplies from "../models/Supply";

type Id = Types.ObjectId | string | null | undefined;

interface StockItems {
  filaments: { spoolId?: Id; label?: string; grams: number }[];
  supplies: { supplyId?: Id; label?: string; qty: number }[];
}

type StockSign = 1 | -1;

const applyFilamentStock = async (
  filament: StockItems["filaments"][number],
  sign: StockSign,
): Promise<string[]> => {
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
};

const applySupplyStock = async (
  usedSupply: StockItems["supplies"][number],
  sign: StockSign,
): Promise<string[]> => {
  if (!usedSupply.supplyId || !usedSupply.qty) {
    return [];
  }

  const warnings: string[] = [];
  if (sign < 0) {
    const supply = await supplies.findById(usedSupply.supplyId);
    if (!supply) {
      warnings.push(`Material "${usedSupply.label}" não existe mais.`);
    } else if (supply.quantityRemaining < usedSupply.qty) {
      warnings.push(
        `Material "${usedSupply.label}" tinha só ${supply.quantityRemaining} ${supply.unit}. Ficou zerado.`,
      );
    }
  }

  await supplies.updateOne({ _id: usedSupply.supplyId }, [
    {
      $set: {
        quantityRemaining: {
          $max: [0, { $add: ["$quantityRemaining", sign * usedSupply.qty] }],
        },
      },
    },
  ]);

  return warnings;
};

/**
 * Aplica a baixa (-1) ou o estorno (+1).
 * @returns Avisos legíveis (ex.: "o carretel ficou zerado"), mostrar no front.
 */
export const applyStock = async (
  items: StockItems,
  sign: StockSign,
): Promise<string[]> => {
  const [filamentWarnings, supplyWarnings] = await Promise.all([
    Promise.all(
      items.filaments.map((filament) => applyFilamentStock(filament, sign)),
    ),
    Promise.all(
      items.supplies.map((usedSupply) => applySupplyStock(usedSupply, sign)),
    ),
  ]);

  return [...filamentWarnings.flat(), ...supplyWarnings.flat()];
};
