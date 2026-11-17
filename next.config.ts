import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança em todas as respostas:
 * - ninguém coloca o app dentro de um iframe de outro site (clickjacking);
 * - o navegador não "adivinha" tipo de arquivo, não manda o caminho completo para outros sites;
 * - em HTTPS, o navegador passa a usar sempre HTTPS (HSTS);
 * - microfone e câmera só para o próprio app (Feynman e foto da questão); localização etc. desligados.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(self), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Bibliotecas de extração rodam como módulos Node normais (o pdf.js usa worker e arquivos próprios
  // que quebram quando empacotados pelo Next).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas", "mammoth", "sharp"],
  // Bibliotecas nativas carregam seus binários por caminhos montados em tempo de execução, que o
  // rastreador de arquivos da Vercel não enxerga: sem isto, as rotas que usam sharp (fotos) ou o
  // pdf.js (PDF) caíam com "Erro 500" em produção. Servidor da Vercel = Linux x64 (glibc).
  outputFileTracingIncludes: {
    "/api/**": [
      "./node_modules/@img/sharp-linux-x64/**",
      "./node_modules/@img/sharp-libvips-linux-x64/**",
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
