import { describe, expect, it } from "vitest";

import { safeNext, signupSchema } from "@/lib/validation/auth";
import { createSubjectSchema } from "@/lib/validation/subject";

describe("createSubjectSchema", () => {
  it("aceita só o nome e usa estilo 'livre'", () => {
    const r = createSubjectSchema.parse({ name: "  Cálculo I  ", exam_date: "", hours_per_day: "" });
    expect(r).toEqual({ name: "Cálculo I", exam_style: "livre" });
  });

  it("converte horas e valida data", () => {
    const r = createSubjectSchema.parse({ name: "ENEM", exam_date: "2026-12-01", hours_per_day: "2.5", exam_style: "enem" });
    expect(r.hours_per_day).toBe(2.5);
    expect(createSubjectSchema.safeParse({ name: "x", exam_date: "01/12/2026" }).success).toBe(false);
  });

  it("rejeita nome vazio, horas fora do limite e estilo desconhecido", () => {
    expect(createSubjectSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(createSubjectSchema.safeParse({ name: "x", hours_per_day: "30" }).success).toBe(false);
    expect(createSubjectSchema.safeParse({ name: "x", exam_style: "cespe2" }).success).toBe(false);
  });
});

describe("auth", () => {
  it("exige senha de 8+ caracteres no cadastro", () => {
    expect(signupSchema.safeParse({ name: "Ana", email: "a@b.com", password: "123" }).success).toBe(false);
  });

  it("senha precisa de letras e número", () => {
    expect(signupSchema.safeParse({ name: "Ana", email: "a@b.com", password: "abcdefgh" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "Ana", email: "a@b.com", password: "12345678" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "Ana", email: "a@b.com", password: "senha-forte-123" }).success).toBe(true);
  });

  it("safeNext bloqueia redirecionamento para fora", () => {
    expect(safeNext("/subjects/1")).toBe("/subjects/1");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext("/a b")).toBe("/dashboard");
    expect(safeNext("/subjects/1?x=2")).toBe("/subjects/1?x=2");
    expect(safeNext(undefined)).toBe("/dashboard");
  });
});
