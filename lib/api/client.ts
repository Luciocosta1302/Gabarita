/** fetch JSON para os componentes do navegador; lança Error com a mensagem da API. */
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
  return json as T;
}

export const selectClass = "border-input h-9 w-full min-w-0 max-w-full truncate rounded-xl border bg-transparent px-3 text-sm";
