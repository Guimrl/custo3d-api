import type { Request, Response } from "express";
import { Types } from "mongoose";
import {
  BadRequestError,
  handleError,
  NotFoundError,
} from "../utils/handleError";
import prints, { PrintDb } from "../models/Print";
import { PrintInput, Spool } from "../types";
import { getSettings } from "../models/Settings";
import equipment from "../models/Equipment";
import spools from "../models/Spools";
import {
  calculateCost,
  spoolPricePerGram,
  supplyUnitCost,
} from "../services/calc";
import supplies from "../models/Supply";
import { applyStock } from "../services/stock";
import { parseDate } from "../utils/dates";

interface IPrintController {
  findAll(req: Request, res: Response): Promise<void>;
  findById(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  complete(req: Request, res: Response): Promise<void>;
  sell(req: Request, res: Response): Promise<void>;
  unsell(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

const toId = (value: unknown) =>
  typeof value === "string" && Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : null;

const spoolLabel = (spool: Spool) =>
  [spool.material, spool.materialType, spool.color, spool.brand && `(${spool.brand})`]
    .filter(Boolean)
    .join(" ");

/**
 * Datas da impressão a partir do corpo da requisição:
 * - quotedAt: null quando não veio (quem chama decide: hoje, ao criar; a atual, ao editar);
 * - soldAt: só entra se o campo veio no corpo (null/"" = desmarcar venda),
 *   para que telas que não enviam a data de venda não a apaguem sem querer.
 */
const readDates = (body: PrintInput) => ({
  quotedAt: parseDate(body.quotedAt, "Data do orçamento"),
  ...("soldAt" in body ? { soldAt: parseDate(body.soldAt, "Data da venda") } : {}),
});

const buildPrint = async (
  body: PrintInput,
): Promise<Omit<PrintDb, "stockDeducted" | "quotedAt" | "soldAt">> => {
  const name = String(body.name ?? "").trim();
  if (!name) {
    throw new BadRequestError("Dê um nome para a peça.");
  }

  const settings = await getSettings();
  const printerId = toId(body.printerId);
  const dryerId = toId(body.dryerId);

  const [printer, dryer] = await Promise.all([
    printerId ? equipment.findById(printerId) : null,
    dryerId ? equipment.findById(dryerId) : null,
  ]);

  const filaments: PrintDb["filaments"] = await Promise.all(
    (body.filaments || [])
      .filter((filament) => filament.spoolId || filament.pricePerGram)
      .map(async (filament) => {
        const spoolId = toId(filament.spoolId);
        const spool = spoolId ? await spools.findById(spoolId) : null;

        return {
          spoolId,
          label: spool ? spoolLabel(spool) : filament.label,
          colorHex: spool?.colorHex ?? filament.colorHex,
          colors: spool?.colors?.length ? spool.colors : filament.colors,
          colorMode: spool?.colorMode ?? filament.colorMode,
          grams: Number(filament.grams) || 0,
          pricePerGram: spool
            ? spoolPricePerGram(spool)
            : Number(filament.pricePerGram) || 0,
        };
      }),
  );

  const usedSupplies: PrintDb["supplies"] = await Promise.all(
    (body.supplies || [])
      .filter((usedSupply) => usedSupply.supplyId || usedSupply.unitCost)
      .map(async (usedSupply) => {
        const supplyId = toId(usedSupply.supplyId);
        const supply = supplyId ? await supplies.findById(supplyId) : null;

        return {
          supplyId,
          label: supply?.name ?? usedSupply.label,
          unit: supply?.unit ?? usedSupply.unit,
          qty: Number(usedSupply.qty) || 0,
          unitCost: supply
            ? supplyUnitCost(supply)
            : Number(usedSupply.unitCost) || 0,
        };
      }),
  );

  const result = calculateCost({
    settings: settings.toObject(),
    printer,
    dryer,
    printHours: body.printHours,
    dryHours: body.dryHours,
    laborMinutes: body.laborMinutes,
    quantity: body.quantity,
    extraCost: body.extraCost,
    filaments,
    supplies: usedSupplies,
  });

  return {
    name,
    customer: body.customer,
    notes: body.notes,
    status: body.status === "concluida" ? "concluida" : "orcamento",
    printerId: printer?._id ?? null,
    dryerId: dryer?._id ?? null,
    printHours: Number(body.printHours) || 0,
    dryHours: Number(body.dryHours) || 0,
    laborMinutes: Number(body.laborMinutes) || 0,
    quantity: result.quantity,
    extraCost: Number(body.extraCost) || 0,
    salePrice: Number(body.salePrice) || 0,
    photoUrl: body.photoUrl,
    filaments,
    supplies: usedSupplies,
    result,
  };
};

class PrintController implements IPrintController {
  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const result = await prints
        .find(status ? { status } : {})
        .sort({ quotedAt: -1, createdAt: -1 });

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao listar impressões");
    }
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await prints.findById(req.params.id);
      if (!result) {
        throw new NotFoundError("Impressão não encontrada.");
      }

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao buscar impressão");
    }
  };

  post = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await buildPrint(req.body);
      const { quotedAt, ...dates } = readDates(req.body);
      let warnings: string[] = [];
      let stockDeducted = false;
      if (data.status === "concluida") {
        warnings = await applyStock(data, -1);
        stockDeducted = true;
      }
      const result = await prints.create({
        ...data,
        ...dates,
        quotedAt: quotedAt ?? new Date(),
        stockDeducted,
      });

      res.status(201).json({ ...result.toJSON(), warnings });
    } catch (error) {
      handleError(res, error, "Erro ao cadastrar impressão");
    }
  };
  complete = async (req: Request, res: Response): Promise<void> => {
    try {
      const print = await prints.findById(req.params.id);
      if (!print) {
        throw new NotFoundError("Impressão não encontrada.");
      }
      const warnings = print.stockDeducted ? [] : await applyStock(print, -1);
      print.status = "concluida";
      print.stockDeducted = true;
      await print.save();

      res.status(200).json({ ...print.toJSON(), warnings });
    } catch (error) {
      handleError(res, error, "Erro ao concluir impressão");
    }
  };

  /** Marca o lote como vendido. Sem data no corpo, usa hoje. */
  sell = async (req: Request, res: Response): Promise<void> => {
    try {
      const soldAt = parseDate(req.body?.soldAt, "Data da venda") ?? new Date();
      const print = await prints.findByIdAndUpdate(
        req.params.id,
        { $set: { soldAt } },
        { new: true },
      );
      if (!print) {
        throw new NotFoundError("Impressão não encontrada.");
      }

      res.status(200).json(print);
    } catch (error) {
      handleError(res, error, "Erro ao marcar venda");
    }
  };

  /** Desfaz a venda (o lote volta a ficar sem data de venda). */
  unsell = async (req: Request, res: Response): Promise<void> => {
    try {
      const print = await prints.findByIdAndUpdate(
        req.params.id,
        { $set: { soldAt: null } },
        { new: true },
      );
      if (!print) {
        throw new NotFoundError("Impressão não encontrada.");
      }

      res.status(200).json(print);
    } catch (error) {
      handleError(res, error, "Erro ao desfazer venda");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const print = await prints.findById(req.params.id);
      if (!print) {
        throw new NotFoundError("Impressão não encontrada.");
      }
      const data = await buildPrint(req.body);
      const { quotedAt, ...dates } = readDates(req.body);

      if (print.stockDeducted) {
        await applyStock(print, +1);
      }
      let warnings: string[] = [];
      let stockDeducted = false;
      if (data.status === "concluida") {
        warnings = await applyStock(data, -1);
        stockDeducted = true;
      }
      print.set({
        ...data,
        ...dates,
        quotedAt: quotedAt ?? print.quotedAt,
        stockDeducted,
      });
      await print.save();

      res.status(200).json({ ...print.toJSON(), warnings });
    } catch (error) {
      handleError(res, error, "Erro ao atualizar impressão");
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const print = await prints.findById(req.params.id);
      if (!print) {
        throw new NotFoundError("Impressão não encontrada.");
      }
      if (print.stockDeducted && req.query.restoreStock !== "false") {
        await applyStock(print, +1);
      }
      await print.deleteOne();

      res.status(200).json({ message: "Impressão removida com sucesso." });
    } catch (error) {
      handleError(res, error, "Erro ao remover impressão");
    }
  };
}

export default new PrintController();
