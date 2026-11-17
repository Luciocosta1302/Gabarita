import type { Metadata, Viewport } from "next";

// Fontes servidas pelo próprio site (Fontsource): títulos em Shippori Mincho, texto em Zen Maru Gothic.
import "@fontsource/zen-maru-gothic/latin-400.css";
import "@fontsource/zen-maru-gothic/latin-500.css";
import "@fontsource/zen-maru-gothic/latin-700.css";
import "@fontsource/shippori-mincho/latin-600.css";
import "@fontsource/shippori-mincho/latin-800.css";
import "@fontsource/shippori-mincho/japanese-600.css";
import "@fontsource/shippori-mincho/japanese-800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gabarita",
  description: "Plano de estudo, questões com fonte e revisão até o dia da prova.",
};

export const viewport: Viewport = { themeColor: "#f4efe4" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
