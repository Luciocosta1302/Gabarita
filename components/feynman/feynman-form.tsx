"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJSON, selectClass } from "@/lib/api/client";
import { encodeWav, resample, toBase64, toMono } from "@/lib/audio/wav";
import { cn } from "@/lib/utils";

const MAX_SECONDS = 180;

export type FeynmanResult = {
  transcript: string;
  feedback: {
    score: number;
    correct: string[];
    missing: string[];
    wrong: string[];
    tip: string;
    citations: { n: number; chunk_id: string; page: number | null }[];
  };
};

/** Grava no navegador e converte para WAV 16 kHz mono (aceito por todas as IAs de transcrição). */
async function toWavBase64(blob: Blob) {
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
    return toBase64(encodeWav(resample(toMono(channels), audio.sampleRate)));
  } finally {
    void ctx.close();
  }
}

export function FeynmanForm({ topics }: { topics: { id: string; name: string }[] }) {
  const router = useRouter();
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FeynmanResult | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const topicName = topics.find((t) => t.id === topicId)?.name ?? "";
  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => () => void (audioUrl && URL.revokeObjectURL(audioUrl)), [audioUrl]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) recorder.current?.stop();
  }, [recording, seconds]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setAudio(new Blob(parts, { type: rec.mimeType }));
      };
      recorder.current = rec;
      setSeconds(0);
      setAudio(null);
      rec.start();
      setRecording(true);
    } catch {
      setError("Não foi possível usar o microfone. Verifique a permissão do navegador ou escreva sua explicação.");
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = audio ? { topic_id: topicId, audio_base64: await toWavBase64(audio) } : { topic_id: topicId, text };
      const r = await postJSON<FeynmanResult>("/api/feynman", body);
      setResult(r);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao analisar a explicação.");
    } finally {
      setBusy(false);
    }
  }

  if (!topics.length) return <p className="text-muted-foreground text-sm">Os tópicos aparecem depois que você envia um material.</p>;

  const ready = audio ? true : text.trim().length >= 30;
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="feynman-topic">Conceito</Label>
        <select id="feynman-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} className={selectClass}>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <p className="bg-pastel-lilac/60 rounded-xl p-3 text-sm">
        Explique <strong>{topicName}</strong> como se ensinasse um colega que nunca viu o assunto: com suas palavras, um exemplo e
        sem ler o material.
      </p>

      {!audio && (
        <div className="grid gap-2">
          <Label htmlFor="feynman-text">Sua explicação</Label>
          <Textarea id="feynman-text" value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={8000} disabled={recording} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {recording ? (
          <Button variant="destructive" onClick={() => recorder.current?.stop()}>
            ■ Parar ({seconds}s / {MAX_SECONDS}s)
          </Button>
        ) : (
          <Button variant="outline" onClick={startRecording} disabled={busy}>
            🎙 {audio ? "Gravar de novo" : "Explicar falando"}
          </Button>
        )}
        {audio && !recording && (
          <>
            <audio controls src={audioUrl ?? undefined} className="h-9" />
            <Button variant="ghost" size="sm" onClick={() => setAudio(null)}>
              Descartar áudio
            </Button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button onClick={submit} disabled={!ready || busy || recording} className="justify-self-start">
        {busy ? "Analisando sua explicação..." : "Ver o que acertei e o que faltou"}
      </Button>

      {result && <FeynmanFeedback result={result} />}
    </div>
  );
}

export function FeynmanFeedback({ result }: { result: FeynmanResult }) {
  const f = result.feedback;
  return (
    <div data-testid="feynman-feedback" className={cn("animate-rise grid gap-3 rounded-2xl p-5 text-sm", f.score >= 70 ? "bg-pastel-mint" : "bg-pastel-peach")}>
      <p className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold" data-testid="feynman-score">
          {f.score}
        </span>
        <span>/ 100 de entendimento</span>
      </p>
      {f.correct.length > 0 && <Block title="✓ O que você explicou bem" items={f.correct} />}
      {f.missing.length > 0 && <Block title="○ O que faltou" items={f.missing} />}
      {f.wrong.length > 0 && <Block title="✗ O que está errado" items={f.wrong} />}
      {f.tip && <p>💡 {f.tip}</p>}
      {f.citations.length > 0 && (
        <p className="text-xs">
          Compare com o material:{" "}
          {f.citations.map((c, i) => (
            <span key={c.chunk_id}>
              {i > 0 && " · "}
              <Link href={`/chunks/${c.chunk_id}`} target="_blank" className="text-primary underline">
                {c.page != null ? `p. ${c.page}` : `trecho ${c.n}`}
              </Link>
            </span>
          ))}
        </p>
      )}
      <details>
        <summary className="cursor-pointer text-xs">Sua explicação {result.transcript ? "(transcrita)" : ""}</summary>
        <p className="mt-1 whitespace-pre-wrap">{result.transcript}</p>
      </details>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <span className="font-semibold">{title}</span>
      <ul className="list-disc pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
