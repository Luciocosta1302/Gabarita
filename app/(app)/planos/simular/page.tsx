import { notFound } from "next/navigation";
import { z } from "zod";

import { SimulateButton } from "@/components/billing/simulate-button";
import { simulationAllowed } from "@/lib/billing/mercadopago";
import { formatBRL } from "@/lib/billing/plan";
import { createClient } from "@/lib/supabase/server";

/** Só em desenvolvimento (sem chave do Mercado Pago): faz o papel da tela de pagamento. */
export default async function SimulatePage({ searchParams }: { searchParams: Promise<{ pagamento?: string }> }) {
  if (!simulationAllowed()) notFound();
  const { pagamento } = await searchParams;
  if (!z.uuid().safeParse(pagamento).success) notFound();
  const supabase = await createClient();
  const { data: pay } = await supabase.from("payments").select("id, amount_cents, status").eq("id", pagamento!).maybeSingle();
  if (!pay) notFound();
  return (
    <div className="mx-auto grid max-w-md gap-4 rounded-2xl border border-dashed p-6 text-center">
      <p className="text-muted-foreground text-xs uppercase">Ambiente de teste — sem cobrança real</p>
      <h1 className="text-2xl font-bold">Pagamento simulado</h1>
      <p>Gabarita Pro · {formatBRL(pay.amount_cents)}</p>
      <div className="justify-self-center">
        <SimulateButton paymentId={pay.id} />
      </div>
    </div>
  );
}
