/**
 * Mensagens de erro para o aluno: sempre "o que aconteceu" + "o que fazer".
 * Usadas quando o servidor não mandou uma mensagem própria (ex.: a função caiu, a internet caiu).
 */

export const NETWORK_ERROR =
  "Não conseguimos falar com o servidor: a internet caiu ou ficou lenta no meio do envio. Confira o Wi-Fi ou os dados móveis e tente de novo.";

export const SERVER_ERROR =
  "Deu um problema do nosso lado (não foi nada que você fez). Tente de novo em alguns minutos; se continuar, tente outro formato de arquivo ou nos avise pela Comunidade.";

export function explainStatus(status: number): string {
  if (status === 401) return "Sua sessão expirou. Entre de novo na sua conta e repita o que estava fazendo.";
  if (status === 403) return "O navegador bloqueou esta ação por segurança. Recarregue a página e tente de novo.";
  if (status === 404) return "Não encontramos o que você pediu: pode ter sido apagado. Recarregue a página.";
  if (status === 413) return "O arquivo é grande demais para enviar. O limite é 20 MB: divida o PDF ou envie fotos das páginas.";
  if (status === 415) return "O formato enviado não foi aceito. Recarregue a página e tente de novo.";
  if (status === 429) return "Muitas tentativas seguidas. Espere um minutinho e tente de novo.";
  if (status === 504 || status === 408) return "O servidor demorou demais para responder. Tente de novo; se for um arquivo grande, divida em partes menores.";
  if (status >= 500) return SERVER_ERROR;
  return `Algo não saiu como esperado (código ${status}). Recarregue a página e tente de novo.`;
}

/** Erros do envio direto para o Storage, traduzidos. */
export function explainStorageError(fileName: string, message: string): string {
  const m = message.toLowerCase();
  if (m.includes("mime") || m.includes("not supported") || m.includes("invalid_mime"))
    return `“${fileName}” está num formato que não aceitamos. Use PDF, slides (PPTX), Word (DOCX), fotos (JPG/PNG) ou áudio (MP3/WAV).`;
  if (m.includes("size") || m.includes("too large") || m.includes("payload"))
    return `“${fileName}” passa de 20 MB. Divida o arquivo em partes menores ou envie fotos das páginas.`;
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to"))
    return `O envio de “${fileName}” parou no meio: a internet caiu ou ficou lenta. Confira a conexão e tente de novo.`;
  if (m.includes("jwt") || m.includes("unauthorized") || m.includes("row-level"))
    return "Sua sessão expirou durante o envio. Entre de novo na sua conta e envie o arquivo outra vez.";
  return `Não conseguimos guardar “${fileName}” (${message}). Tente de novo em alguns minutos.`;
}
