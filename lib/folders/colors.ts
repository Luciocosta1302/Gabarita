/** Cores de capa das pastas (cores tradicionais da identidade). Sem cor escolhida = automática pela ordem. */
export const FOLDER_COLORS = [
  { id: "ai", label: "Índigo", bg: "bg-ai", text: "text-washi", hex: "#22334b" },
  { id: "shu", label: "Vermelho", bg: "bg-shu", text: "text-washi", hex: "#c8372d" },
  { id: "matcha", label: "Matchá", bg: "bg-matcha", text: "text-washi", hex: "#5d8a3a" },
  { id: "kin", label: "Dourado", bg: "bg-kin", text: "text-ink", hex: "#c79a3a" },
  { id: "sumi", label: "Sumi", bg: "bg-[#3b2f2a]", text: "text-washi", hex: "#3b2f2a" },
  { id: "sakura", label: "Sakura", bg: "bg-[#e9a6b1]", text: "text-ink", hex: "#e9a6b1" },
] as const;
export type FolderColor = (typeof FOLDER_COLORS)[number]["id"];

export function folderCover(color: string | null | undefined, index = 0) {
  return FOLDER_COLORS.find((c) => c.id === color) ?? FOLDER_COLORS[[0, 1, 2, 4][index % 4]];
}
