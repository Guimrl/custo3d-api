import type { Request, Response } from "express";
import supplies from "../models/Supply";
import {
  BadRequestError,
  handleError,
  NotFoundError,
  withoutMetaFields,
} from "../utils/handleError";

interface ISupplyController {
  findAll(req: Request, res: Response): Promise<void>;
  findById(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  restock(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

class SupplyController implements ISupplyController {
  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter =
        req.query.all === "true" ? {} : { archived: { $ne: true } };
      const result = await supplies
        .find(filter)
        .sort({ archived: 1, category: 1, name: 1 });

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao listar materiais");
    }
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await supplies.findById(req.params.id);
      if (!result) {
        throw new NotFoundError("Material não encontrado.");
      }

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao buscar material");
    }
  };

  post = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = withoutMetaFields(req.body);
      if (body.quantityRemaining === "" || body.quantityRemaining == null) {
        body.quantityRemaining = body.quantityPurchased;
      }
      const result = await supplies.create(body);
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao cadastrar material");
    }
  };

  restock = async (req: Request, res: Response): Promise<void> => {
    try {
      const quantity = Number(req.body?.quantity) || 0;
      const price = Number(req.body?.price) || 0;
      if (quantity <= 0) {
        throw new BadRequestError("Quantidade deve ser maior que zero.");
      }

      const result = await supplies.findByIdAndUpdate(
        req.params.id,
        {
          $inc: {
            quantityPurchased: quantity,
            quantityRemaining: quantity,
            pricePaid: price,
          },
        },
        { new: true },
      );
      if (!result) {
        throw new NotFoundError("Material não encontrado.");
      }
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao repor material");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await supplies.findByIdAndUpdate(
        req.params.id,
        { $set: withoutMetaFields(req.body) },
        { new: true, runValidators: true },
      );
      if (!result) {
        throw new NotFoundError("Material não encontrado.");
      }
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao atualizar material");
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await supplies.findByIdAndDelete(req.params.id);
      if (!result) {
        throw new NotFoundError("Material não encontrado.");
      }
      res.status(200).json({ message: "Material removido com sucesso." });
    } catch (error) {
      handleError(res, error, "Erro ao remover material");
    }
  };
}

export default new SupplyController();
