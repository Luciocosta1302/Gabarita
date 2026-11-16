/** fetch JSON para os componentes do navegador; lança Error com a mensagem da API. */
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; upgrade?: boolean };
  if (!res.ok) throw Object.assign(new Error(json.error ?? `Erro ${res.status}`), { upgrade: !!json.upgrade });
  return json as T;
}

export const selectClass = "border-input h-9 rounded-xl border bg-transparent px-3 text-sm";
