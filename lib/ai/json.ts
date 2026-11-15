import { z } from "zod";

import type { AIProvider, TextRequest, Usage } from "./types";

export class AIValidationError extends Error {
  constructor(
    message: string,
    readonly rawOutputs: string[],
  ) {
    super(message);
    this.name = "AIValidationError";
  }
}

/** Tira cercas ```json ... ``` e texto antes/depois do JSON. */
export function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start === -1) return body;
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  const end = body.lastIndexOf(close);
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

function parseWith<T>(schema: z.ZodType<T>, raw: string): { ok: true; data: T } | { ok: false; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(extractJSON(raw));
  } catch (e) {
    return { ok: false, error: `JSON inválido: ${(e as Error).message}` };
  }
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: z.prettifyError(result.error) };
}

export type JSONRequest<T> = Omit<TextRequest, "prompt"> & {
  prompt: string;
  schema: z.ZodType<T>;
};

/**
 * Pede JSON à IA e valida com Zod. Se a validação falhar, tenta de novo 1x,
 * mandando o erro de volta para o modelo corrigir.
 */
export async function generateJSONWith<T>(
  provider: AIProvider,
  req: JSONRequest<T>,
): Promise<{ data: T; usage: Usage }> {
  const { schema, ...rest } = req;
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  const system = [
    rest.system,
    `Responda APENAS com um JSON válido que siga este JSON Schema, sem texto fora do JSON:\n${jsonSchema}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const outputs: string[] = [];

  const first = await provider.generateText({ ...rest, system });
  add(usage, first.usage);
  outputs.push(first.text);
  const parsed = parseWith(schema, first.text);
  if (parsed.ok) return { data: parsed.data, usage };

  const retry = await provider.generateText({
    ...rest,
    system,
    prompt: `${rest.prompt}\n\nSua resposta anterior não passou na validação:\n${parsed.error}\n\nResposta anterior:\n${first.text}\n\nDevolva o JSON corrigido.`,
  });
  add(usage, retry.usage);
  outputs.push(retry.text);
  const reparsed = parseWith(schema, retry.text);
  if (reparsed.ok) return { data: reparsed.data, usage };

  throw new AIValidationError(`A resposta da IA não passou na validação após 2 tentativas: ${reparsed.error}`, outputs);
}

function add(total: Usage, u: Usage) {
  total.inputTokens += u.inputTokens;
  total.outputTokens += u.outputTokens;
}
