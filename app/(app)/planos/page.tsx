import { CheckoutButton } from "@/components/billing/checkout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPlan, usage } from "@/lib/billing/limits";
import { FREE_LIMITS, formatBRL, PRO_PERIOD_DAYS, PRO_PRICE_CENTS } from "@/lib/billing/plan";
import { getUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Planos — Gabarita" };

const STATUS_MSG: Record<string, string> = {
  aprovado: "Pagamento aprovado! Seu Pro já está valendo. 🎉",
  pendente: "Pagamento pendente. Assim que o Pix cair, o Pro é liberado sozinho.",
  falhou: "O pagamento não foi concluído. Tente de novo quando quiser.",
};

const ROWS: [string, string, string][] = [
  ["Materiais por mês", `${FREE_LIMITS.materialsPerMonth}`, "Sem limite"],
  ["Questões geradas por dia", `${FREE_LIMITS.questionsPerDay}`, "Sem limite"],
  ["Questões com fonte, caderno de erros, revisão, plano, simulado, trilhas", "✓", "✓"],
  ["Discursivas com rubrica, foto da questão, áudio de aula", "✓", "✓"],
  ["Prova do Professor", "—", "✓"],
  ["Modo Feynman", "—", "✓"],
  ["5 questões por dia no WhatsApp", "—", "✓"],
];

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase, user } = await getUser();
  const [plan, used, { data: payments }] = await Promise.all([
    loadPlan(supabase, user!.id),
    usage(supabase, user!.id),
    supabase.from("payments").select("id, status, amount_cents, created_at, paid_at").order("created_at", { ascending: false }).limit(10),
  ]);
  const until = plan.proUntil ? new Date(plan.proUntil).toLocaleDateString("pt-BR") : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Planos</h1>
        <p className="text-muted-foreground text-sm">Comece de graça. Quando quiser tudo, o Pro custa {formatBRL(PRO_PRICE_CENTS)} por {PRO_PERIOD_DAYS} dias, no Pix ou cartão.</p>
      </div>
      {status && STATUS_MSG[status] && (
        <p role="status" className="bg-pastel-mint rounded-2xl p-4 text-sm">
          {STATUS_MSG[status]}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={cn(!plan.pro && "border-primary ring-primary/20 ring-2")}>
          <CardHeader>
            <CardTitle>Grátis</CardTitle>
            <p className="font-display text-3xl font-bold">R$ 0</p>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm" data-testid="usage">
            <p>
              Hoje: <strong>{plan.pro ? used.questionsToday : `${used.questionsToday}/${FREE_LIMITS.questionsPerDay}`}</strong> questões geradas
            </p>
            <p>
              Este mês: <strong>{plan.pro ? used.materialsThisMonth : `${used.materialsThisMonth}/${FREE_LIMITS.materialsPerMonth}`}</strong> materiais
            </p>
          </CardContent>
        </Card>
        <Card className={cn("from-pastel-rose to-pastel-lilac bg-gradient-to-br", plan.pro && "border-primary ring-primary/20 ring-2")}>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <p className="font-display text-3xl font-bold">
              {formatBRL(PRO_PRICE_CENTS)} <span className="text-base font-normal">/ {PRO_PERIOD_DAYS} dias</span>
            </p>
          </CardHeader>
          <CardContent className="grid gap-3" data-testid="pro-card">
            {plan.pro ? (
              <p className="font-semibold" data-testid="pro-active">
                Seu Pro está ativo{until ? ` até ${until}` : ""}.
              </p>
            ) : null}
            <CheckoutButton label={plan.pro ? "Renovar (soma +30 dias)" : "Assinar com Pix ou cartão"} />
            <p className="text-foreground/70 text-xs">Sem renovação automática: você paga quando quiser continuar.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2">Recurso</th>
                <th className="py-2">Grátis</th>
                <th className="py-2">Pro</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([r, f, p]) => (
                <tr key={r} className="border-t">
                  <td className="py-2 pr-2">{r}</td>
                  <td className="py-2">{f}</td>
                  <td className="py-2 font-medium">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {payments && payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{new Date(p.created_at).toLocaleDateString("pt-BR")} · {formatBRL(p.amount_cents)}</span>
                  <span className="text-muted-foreground">{{ pending: "pendente", approved: "aprovado", rejected: "recusado", cancelled: "cancelado", refunded: "devolvido" }[p.status] ?? p.status}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
