import type { Request, Response } from "express";
import { isUploadEnabled, uploadToImgbb } from "../services/imgbb";
import { BadRequestError, handleError } from "../utils/handleError";

const MAX_BYTES = 8 * 1024 * 1024;

class UploadController {
  static getStatus = async (req: Request, res: Response) => {
    res.status(200).json({ enabled: isUploadEnabled(), maxBytes: MAX_BYTES });
  };

  static postImage = async (req: Request, res: Response) => {
    try {
      if (!isUploadEnabled()) {
        res.status(503).json({
          message:
            "Upload desativado: defina IMGBB_API_KEY no .env da API. Você ainda pode colar a URL da foto.",
        });
        return;
      }
      const raw = String(req.body?.image ?? "");

      const match = raw.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
      if (raw.startsWith("data:") && !match) {
        throw new BadRequestError("O arquivo enviado não é uma imagem.");
      }

      const base64 = match ? match[2] : raw;
      if (!base64) {
        throw new BadRequestError("Nenhuma imagem enviada.");
      }

      // Cada 4 caracteres base64 = 3 bytes.
      if ((base64.length * 3) / 4 > MAX_BYTES) {
        throw new BadRequestError(
          `Imagem muito grande (máximo ${MAX_BYTES / 1024 / 1024} MB).`,
        );
      }

      const result = await uploadToImgbb(base64, req.body?.name);

      res.status(201).json(result);
    } catch (error) {
      handleError(res, error, "Erro ao enviar a imagem");
    }
  };
}

export default UploadController;
