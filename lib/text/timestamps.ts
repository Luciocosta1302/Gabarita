/** Tempos [mm:ss] / [h:mm:ss] da transcrição de vídeo → segundos (para abrir o vídeo naquele ponto). */
export const TIMESTAMP_SPLIT = /(\[(?:\d{1,2}:)?\d{1,2}:\d{2}\])/;

export function timestampSeconds(token: string): number | null {
  const m = token.match(/^\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]$/);
  if (!m) return null;
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (s >= 60 || (m[1] !== undefined && min >= 60)) return null;
  return h * 3600 + min * 60 + s;
}

/** Link do YouTube no segundo dado (só para links do próprio YouTube). */
export function videoAt(url: string, seconds: number) {
  const u = new URL(url);
  u.searchParams.set("t", `${seconds}s`);
  return u.toString();
}
