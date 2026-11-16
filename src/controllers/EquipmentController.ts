import type { Request, Response } from "express";
import equipment from "../models/Equipment";
import {
  handleError,
  NotFoundError,
  withoutMetaFields,
} from "../utils/handleError";

interface IEquipmentController {
  findAll(req: Request, res: Response): Promise<void>;
  findById(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

class EquipmentController implements IEquipmentController {
  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await equipment.find().sort({ type: -1, name: 1 });

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao listar equipamentos");
    }
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await equipment.findById(req.params.id);
      if (!result) {
        throw new NotFoundError("Equipamento não encontrado.");
      }
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao buscar equipamento");
    }
  };

  post = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await equipment.create(withoutMetaFields(req.body));
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao cadastrar equipamento");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await equipment.findByIdAndUpdate(
        req.params.id,
        { $set: withoutMetaFields(req.body) },
        { new: true, runValidators: true },
      );
      if (!result) {
        throw new NotFoundError("Equipamento não encontrado.");
      }
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao atualizar equipamento");
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await equipment.findByIdAndDelete(req.params.id);
      if (!result) {
        throw new NotFoundError("Equipamento não encontrado.");
      }
      res.status(200).json({ message: "Equipamento removido com sucesso." });
    } catch (error) {
      handleError(res, error, "Erro ao remover equipamento");
    }
  };
}

export default new EquipmentController();
