import type { Request, Response } from "express";
import settings, { getSettings, SETTINGS_ID } from "../models/Settings";
import { handleError, withoutMetaFields } from "../utils/handleError";

class SettingsController {
  static getSettings = async (_req: Request, res: Response) => {
    try {
      res.status(200).json(await getSettings());
    } catch (error) {
      handleError(res, error, "Erro ao buscar configurações");
    }
  };

  static updateSettings = async (req: Request, res: Response) => {
    try {
      const result = await settings.findByIdAndUpdate(
        SETTINGS_ID,
        { $set: withoutMetaFields(req.body) },
        { new: true, upsert: true, runValidators: true },
      );

      res.status(200).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao salvar configurações");
    }
  };
}

export default SettingsController;
