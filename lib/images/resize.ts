import "server-only";

import { UserFacingError } from "@/lib/errors";

/**
 * Reduz a foto para o tamanho que a IA usa (1568 px no lado maior, JPEG). O `sharp` é carregado só
 * aqui, na hora: se o binário dele faltar no servidor, só a leitura de fotos para — o resto do app
 * (e do envio) continua funcionando.
 */
let sharpLib: Promise<typeof import("sharp").default> | null = null;

function loadSharp() {
  sharpLib ??= import("sharp")
    .then((m) => m.default)
    .catch((e) => {
      sharpLib = null;
      console.error("[images] sharp não carregou:", e);
      throw new UserFacingError(
        "O servidor não conseguiu abrir imagens agora (problema do nosso lado). Tente de novo em alguns minutos; PDFs com texto e Word continuam funcionando.",
      );
    });
  return sharpLib;
}

export async function toAiJpeg(data: Uint8Array, name = "a imagem"): Promise<Buffer> {
  const sharp = await loadSharp();
  try {
    return await sharp(data).rotate().resize(1568, 1568, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new UserFacingError(
      `Não foi possível abrir ${name === "a imagem" ? name : `“${name}”`}: o arquivo pode estar corrompido ou num formato que não lemos. Tire um print da foto (ou salve como JPG) e envie de novo.`,
    );
  }
}
