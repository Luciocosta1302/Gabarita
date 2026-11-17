import { describe, expect, it } from "vitest";

import { explainStatus, explainStorageError, NETWORK_ERROR, SERVER_ERROR } from "@/lib/api/explain";

describe("mensagens de erro dizem o que houve e o que fazer", () => {
  it("códigos HTTP sem mensagem do servidor", () => {
    expect(explainStatus(500)).toBe(SERVER_ERROR);
    expect(explainStatus(502)).toContain("não foi nada que você fez");
    expect(explainStatus(401)).toMatch(/sessão expirou.*Entre de novo/);
    expect(explainStatus(413)).toContain("20 MB");
    expect(explainStatus(504)).toContain("demorou demais");
    expect(explainStatus(418)).toContain("código 418");
    expect(NETWORK_ERROR).toContain("internet");
  });
  it("erros do envio do arquivo", () => {
    expect(explainStorageError("a.exe", "mime type application/x-msdownload is not supported")).toContain("formato");
    expect(explainStorageError("b.pdf", "The object exceeded the maximum allowed size")).toContain("20 MB");
    expect(explainStorageError("c.pdf", "Failed to fetch")).toContain("internet");
    expect(explainStorageError("d.pdf", "new row violates row-level security policy")).toContain("sessão");
  });
});
