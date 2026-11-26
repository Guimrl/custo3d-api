import type { Request, Response } from "express";
import { Types } from "mongoose";
import {
  BadRequestError,
  handleError,
  NotFoundError,
  withoutMetaFields,
} from "../utils/handleError";
import brands from "../models/Brand";
import spools from "../models/Spools";

interface ISpoolController {
  findAll(req: Request, res: Response): Promise<void>;
  findBySearch(req: Request, res: Response): Promise<void>;
  findById(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

/**
 * Marca escolhida no cadastro: guarda o id e copia o nome para o campo `brand`
 * (texto), que é o que filtros, rótulos e impressões antigas usam.
 * brandId vazio = carretel sem marca cadastrada (o texto digitado fica como está).
 */
const applyBrand = async (data: Record<string, unknown>) => {
  if (!("brandId" in data)) {
    return;
  }

  if (!data.brandId) {
    data.brandId = null;

    return;
  }

  if (!Types.ObjectId.isValid(String(data.brandId))) {
    throw new BadRequestError("Marca inválida.");
  }

  const brand = await brands.findById(data.brandId);
  if (!brand) {
    throw new BadRequestError("Marca não encontrada.");
  }

  data.brand = brand.name;
  // Sem tara informada, usa a da marca (dá para trocar na hora de pesar).
  if (!Number(data.emptySpoolGrams) && brand.emptySpoolGrams) {
    data.emptySpoolGrams = brand.emptySpoolGrams;
  }
};

const parseBody = async (body: unknown) => {
  const data = withoutMetaFields(body);
  await applyBrand(data);
  if (Array.isArray(data.colors)) {
    const colors = data.colors.filter(Boolean) as string[];
    data.colors = colors;
    if (colors.length) {
      data.colorHex = colors[0];
    }
    if (colors.length <= 1) {
      data.colorMode = "solid";
    }
  }
  return data;
};

class SpoolController implements ISpoolController {
  findAll = async (req: Request, res: Response): Promise<void> => {
    const { query } = req;

    try {
      const filter = query?.all === "true" ? {} : { archived: { $ne: true } };
      const result = await spools
        .find(filter)
        .sort({ archived: 1, material: 1, color: 1 });

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao listar carretéis");
    }
  };

  findBySearch = async (req: Request, res: Response): Promise<void> => {
    const { query } = req;

    try {
      const searchTerm = String(query?.q ?? "").trim();
      const regex = new RegExp(
        searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      const result = await spools.find({
        $or: [{ material: regex }, { color: regex }, { brand: regex }],
      });

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao buscar carretéis");
    }
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await spools.findById(req.params.id);
      if (!result) {
        throw new NotFoundError("Carretel não encontrado.");
      }

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao buscar carretel");
    }
  };

  post = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await spools.create(await parseBody(req.body));
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao criar carretél");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await spools.findByIdAndUpdate(
        req.params.id,
        { $set: await parseBody(req.body) },
        { new: true, runValidators: true },
      );
      if (!result) {
        throw new NotFoundError("Carretel não encontrado.");
      }
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao atualizar carretel");
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await spools.findByIdAndDelete(req.params.id);
      if (!result) {
        throw new NotFoundError("Carretel não encontrado.");
      }

      res.status(200).json({ message: "Carretel removido com sucesso." });
    } catch (error) {
      handleError(res, error, "Erro ao remover carretel");
    }
  };
}

export default new SpoolController();
