import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Gabarita",
  description: "Plano de estudo, questões com fonte e revisão até o dia da prova.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
