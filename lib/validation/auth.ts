import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
  next: z.string().optional(),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(80),
  email: z.email("E-mail inválido"),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres")
    .max(72, "Senha longa demais (máx. 72 caracteres)")
    .regex(/[A-Za-zÀ-ÿ]/, "A senha precisa ter letras")
    .regex(/\d/, "A senha precisa ter pelo menos um número"),
});

/** Só aceita caminhos internos, para não virar redirecionamento aberto. */
export function safeNext(next: string | undefined | null): string {
  // "//site" e "/\site" são tratados pelo navegador como outro site
  return next && /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : "/dashboard";
}
