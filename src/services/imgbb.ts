import { ExternalServiceError } from "../utils/handleError";

export interface UploadResult {
  url: string;
  thumbUrl?: string;
  deleteUrl?: string;
}

interface ImgbbResponse {
  success?: boolean;
  data?: { url: string; thumb?: { url: string }; delete_url?: string };
  error?: { message?: string };
}

export const isUploadEnabled = () => Boolean(process.env.IMGBB_API_KEY);

/**
 * Envia uma imagem (em base64, sem o prefixo "data:image/...;base64,") ao ImgBB.
 * @param base64 conteúdo da imagem
 * @param name   nome do arquivo
 */
export const uploadToImgbb = async (
  base64: string,
  name?: string,
): Promise<UploadResult> => {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error("Upload desativado: defina IMGBB_API_KEY no .env da API.");
  }

  const form = new FormData();
  form.append("image", base64);
  if (name) {
    form.append("name", name.replace(/\.[^.]+$/, ""));
  }

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      body: form,
    },
  );

  const json = (await response.json().catch(() => ({}))) as ImgbbResponse;

  if (!response.ok || !json.success || !json.data) {
    throw new ExternalServiceError(
      `O ImgBB recusou o envio: ${json.error?.message ?? response.statusText}`,
    );
  }

  return {
    url: json.data.url,
    thumbUrl: json.data.thumb?.url,
    deleteUrl: json.data.delete_url,
  };
};
