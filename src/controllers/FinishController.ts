import type { Request, Response } from "express";
import finishes, { DEFAULT_FINISHES } from "../models/Finish";
import spools from "../models/Spools";
import {
  BadRequestError,
  handleError,
  isDuplicateKeyError,
  NotFoundError,
  withoutMetaFields,
} from "../utils/handleError";

interface IFinishController {
  findAll(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

const handleFinishError = (res: Response, error: unknown, context: string) => {
  handleError(
    res,
    isDuplicateKeyError(error) ? new BadRequestError("Já existe um acabamento com esse nome.") : error,
    context,
  );
};

class FinishController implements IFinishController {
  findAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      if ((await finishes.countDocuments()) === 0) {
        await finishes.insertMany(
          DEFAULT_FINISHES.map((name, index) => ({ name, order: index })),
        );
      }

      const result = await finishes.find().sort({ order: 1, name: 1 });

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao listar acabamentos");
    }
  };

  post = async (req: Request, res: Response): Promise<void> => {
    try {
      const last = await finishes.findOne().sort({ order: -1 });
      const result = await finishes.create({
        order: (last?.order ?? 0) + 1,
        ...withoutMetaFields(req.body),
      });

      res.status(201).json(result);
    } catch (error) {
      handleFinishError(res, error, "Erro ao cadastrar acabamento");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await finishes.findByIdAndUpdate(
        req.params.id,
        { $set: withoutMetaFields(req.body) },
        { new: true, runValidators: true },
      );
      if (!result) {
        throw new NotFoundError("Acabamento não encontrado.");
      }

      res.status(200).json(result);
    } catch (error) {
      handleFinishError(res, error, "Erro ao atualizar acabamento");
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await finishes.findByIdAndDelete(req.params.id);
      if (!result) {
        throw new NotFoundError("Acabamento não encontrado.");
      }

      await spools.updateMany(
        { finishIds: result._id },
        { $pull: { finishIds: result._id } },
      );

      res.status(200).json({ message: "Acabamento removido com sucesso." });
    } catch (error) {
      handleError(res, error, "Erro ao remover acabamento");
    }
  };
}

export default new FinishController();
