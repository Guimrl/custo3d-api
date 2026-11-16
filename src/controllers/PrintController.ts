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

interface IPrintController {
  findAll(req: Request, res: Response): Promise<void>;
  findById(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  complete(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

const toId = (value: unknown) =>
  typeof value === "string" && Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : null;

const spoolLabel = (spool: Spool) =>
  [spool.material, spool.color, spool.brand && `(${spool.brand})`]
    .filter(Boolean)
    .join(" ");

const buildPrint = async (
  body: PrintInput,
): Promise<Omit<PrintDb, "stockDeducted">> => {
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
      .filter((filtered) => filtered.spoolId || filtered.pricePerGram)
      .map(async (result) => {
        const id = toId(result.spoolId);
        const spool = id ? await spools.findById(id) : null;
        return {
          spoolId: id,
          label: spool ? spoolLabel(spool) : result.label,
          colorHex: spool?.colorHex ?? result.colorHex,
          // "Foto" das cores, para a bolinha da impressão continuar certa mesmo se o carretel mudar.
          colors: spool?.colors?.length ? spool.colors : result.colors,
          colorMode: spool?.colorMode ?? result.colorMode,
          grams: Number(result.grams) || 0,
          pricePerGram: spool
            ? spoolPricePerGram(spool)
            : Number(result.pricePerGram) || 0,
        };
      }),
  );
  const usedSupplies: PrintDb["supplies"] = [];
  for (const bsupplies of body.supplies || []) {
    if (!bsupplies.supplyId && !bsupplies.unitCost) {
      continue;
    }
    const id = toId(bsupplies.supplyId);
    const supply = id ? await supplies.findById(id) : null;
    usedSupplies.push({
      supplyId: id,
      label: supply?.name ?? bsupplies.label,
      unit: supply?.unit ?? bsupplies.unit,
      qty: Number(bsupplies.qty) || 0,
      unitCost: supply
        ? supplyUnitCost(supply)
        : Number(bsupplies.unitCost) || 0,
    });
  }

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
        .sort({ createdAt: -1 });

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
      let warnings: string[] = [];
      let stockDeducted = false;
      if (data.status === "concluida") {
        warnings = await applyStock(data, -1);
        stockDeducted = true;
      }
      const result = await prints.create({ ...data, stockDeducted });

      res.status(201).json({ ...result.toJSON(), warnings });
    } catch (error) {
      handleError(res, error, "Erro ao cadastrar impressão");
    }
  };
  complete = async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await prints.findById(req.params.id);
      if (!doc) {
        throw new NotFoundError("Impressão não encontrada.");
      }
      const warnings = doc.stockDeducted ? [] : await applyStock(doc, -1);
      doc.status = "concluida";
      doc.stockDeducted = true;
      await doc.save();

      res.status(200).json({ ...doc.toJSON(), warnings });
    } catch (error) {
      handleError(res, error, "Erro ao concluir impressão");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const old = await prints.findById(req.params.id);
      if (!old) {
        throw new NotFoundError("Impressão não encontrada.");
      }
      const data = await buildPrint(req.body);

      if (old.stockDeducted) {
        await applyStock(old, +1);
      }
      let warnings: string[] = [];
      let stockDeducted = false;
      if (data.status === "concluida") {
        warnings = await applyStock(data, -1);
        stockDeducted = true;
      }
      old.set({ ...data, stockDeducted });
      await old.save();

      res.status(200).json({ ...old.toJSON(), warnings });
    } catch (error) {
      handleError(res, error, "Erro ao atualizar impressão");
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await prints.findById(req.params.id);
      if (!doc) {
        throw new NotFoundError("Impressão não encontrada.");
      }
      if (doc.stockDeducted && req.query.restoreStock !== "false") {
        await applyStock(doc, +1);
      }
      await doc.deleteOne();

      res.status(200).json({ message: "Impressão removida com sucesso." });
    } catch (error) {
      handleError(res, error, "Erro ao remover impressão");
    }
  };
}

export default new PrintController();
