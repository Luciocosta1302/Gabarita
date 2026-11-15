import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bibliotecas de extração rodam como módulos Node normais (o pdf.js usa worker e arquivos próprios
  // que quebram quando empacotados pelo Next).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth", "sharp"],
};

export default nextConfig;
