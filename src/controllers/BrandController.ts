import type { Request, Response } from "express";
import lodash from "lodash";
import brands from "../models/Brand";
import spools from "../models/Spools";
import type { BrandMaterial } from "../types";
import {
  BadRequestError,
  handleError,
  isDuplicateKeyError,
  NotFoundError,
  withoutMetaFields,
} from "../utils/handleError";

interface IBrandController {
  findAll(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

const handleBrandError = (res: Response, error: unknown, context: string) => {
  handleError(
    res,
    isDuplicateKeyError(error) ? new BadRequestError("Já existe uma marca com esse nome.") : error,
    context,
  );
};

/**
 * Limpa a lista de materiais: tira linhas sem material, junta materiais
 * repetidos ("PLA" duas vezes) e remove tipos vazios ou duplicados.
 */
const cleanMaterials = (materials: unknown): BrandMaterial[] => {
  const rows = (Array.isArray(materials) ? materials : []) as Partial<BrandMaterial>[];
  const filled = rows
    .map((row) => ({
      material: String(row.material ?? "").trim(),
      types: (row.types ?? []).map((type) => String(type).trim()).filter(Boolean),
    }))
    .filter((row) => row.material);

  return lodash.map(
    lodash.groupBy(filled, (row) => row.material.toLowerCase()),
    (group) => ({
      material: group[0].material,
      types: lodash.uniqBy(group.flatMap((row) => row.types), (type) => type.toLowerCase()),
    }),
  );
};

const parseBody = (body: unknown) => {
  const data = withoutMetaFields(body);

  return "materials" in data ? { ...data, materials: cleanMaterials(data.materials) } : data;
};

class BrandController implements IBrandController {
  findAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await brands.find().collation({ locale: "pt", strength: 2 }).sort({ name: 1 });

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao listar marcas");
    }
  };

  post = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await brands.create(parseBody(req.body));

      res.status(201).json(result);
    } catch (error) {
      handleBrandError(res, error, "Erro ao cadastrar marca");
    }
  };

  /** Renomear a marca atualiza também o nome gravado nos carretéis dela. */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await brands.findByIdAndUpdate(
        req.params.id,
        { $set: parseBody(req.body) },
        { new: true, runValidators: true },
      );
      if (!result) {
        throw new NotFoundError("Marca não encontrada.");
      }

      await spools.updateMany({ brandId: result._id }, { $set: { brand: result.name } });

      res.status(200).json(result);
    } catch (error) {
      handleBrandError(res, error, "Erro ao atualizar marca");
    }
  };

  /** Os carretéis da marca continuam com o nome (texto); só perdem a ligação. */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await brands.findByIdAndDelete(req.params.id);
      if (!result) {
        throw new NotFoundError("Marca não encontrada.");
      }

      await spools.updateMany({ brandId: result._id }, { $set: { brandId: null } });

      res.status(200).json({ message: "Marca removida com sucesso." });
    } catch (error) {
      handleError(res, error, "Erro ao remover marca");
    }
  };
}

export default new BrandController();
