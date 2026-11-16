import type { Request, Response } from "express";
import {
  handleError,
  NotFoundError,
  withoutMetaFields,
} from "../utils/handleError";
import spools from "../models/Spools";

interface ISpoolController {
  findAll(req: Request, res: Response): Promise<void>;
  findBySearch(req: Request, res: Response): Promise<void>;
  findById(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

const parseBody = (body: unknown) => {
  const data = withoutMetaFields(body);
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
      const searchTerm = String(query?.term ?? "").trim();
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
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao buscar carretéis");
    }
  };

  post = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await spools.create(parseBody(req.body));
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao criar carretél");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await spools.findByIdAndUpdate(
        req.params.id,
        { $set: parseBody(req.body) },
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
