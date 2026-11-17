import { explainStatus, NETWORK_ERROR } from "./explain";

/**
 * fetch JSON para os componentes do navegador. Em erro, lança Error com uma mensagem para o aluno:
 * a do servidor (que já diz o que fazer) ou, sem ela, a explicação do código (`explainStatus`).
 */
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || explainStatus(res.status));
  return json as T;
}

export const selectClass = "border-input h-10 w-full min-w-0 max-w-full truncate rounded-xl border-[1.5px] bg-card px-3 text-sm";
