"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import type { ChatResponse, Citation } from "@/app/api/chat/route";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postJSON } from "@/lib/api/client";
import { CITATION_SPLIT, citationNumbers } from "@/lib/text/citations";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; citations?: Citation[]; noBasis?: boolean };

/** Troca os marcadores [n] da resposta por links para o trecho citado. */
function withCitationLinks(text: string, citations: Citation[] = []) {
  const byN = new Map(citations.map((c) => [c.n, c]));
  return text.split(CITATION_SPLIT).map((part, i) => {
    const nums = citationNumbers(part);
    if (!nums) return <span key={i}>{part}</span>;
    return (
      <span key={i}>
        {nums.map((n, j) => {
          const c = byN.get(n);
          return c ? (
            <Link key={j} href={`/chunks/${c.chunk_id}`} className="text-primary font-medium underline" target="_blank">
              [{c.page != null ? `p. ${c.page}` : n}]
            </Link>
          ) : null;
        })}
      </span>
    );
  });
}

export function Chat({ subjectId }: { subjectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await postJSON<ChatResponse>("/api/chat", { subject_id: subjectId, message: text, history });
      setMessages((m) => [...m, { role: "assistant", content: res.answer, citations: res.citations, noBasis: !res.has_basis }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao responder.");
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3" data-testid="chat-messages">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Pergunte qualquer coisa sobre o seu material. As respostas citam a página de onde saiu cada informação.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "animate-rise max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
              m.role === "user" ? "bg-primary text-primary-foreground justify-self-end" : "bg-card border",
              m.noBasis && "bg-muted",
            )}
          >
            {m.role === "assistant" ? withCitationLinks(m.content, m.citations) : m.content}
            {m.citations && m.citations.length > 0 && (
              <div className="text-muted-foreground mt-2 border-t pt-2 text-xs" data-testid="chat-citations">
                Fontes:{" "}
                {m.citations.map((c, j) => (
                  <span key={c.chunk_id}>
                    {j > 0 && " · "}
                    <Link href={`/chunks/${c.chunk_id}`} className="underline" target="_blank">
                      {c.material_title}
                      {c.page != null ? `, p. ${c.page}` : ""}
                    </Link>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bg-card text-muted-foreground w-fit rounded-2xl border px-4 py-3 text-sm">Pensando...</div>}
        <div ref={endRef} />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <form onSubmit={send} className="flex items-end gap-2">
        <Textarea
          aria-label="Sua pergunta"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          rows={2}
          maxLength={2000}
          placeholder="Ex.: O que é fotossíntese?"
          className="min-h-12"
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
