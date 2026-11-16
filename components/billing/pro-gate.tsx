import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PRO_FEATURE_LABELS, type ProFeature } from "@/lib/billing/plan";

/** Convite para o Pro no lugar de um recurso pago. */
export function ProGate({ feature, children }: { feature: ProFeature; children?: React.ReactNode }) {
  return (
    <div data-testid="pro-gate" className="from-pastel-rose to-pastel-lilac grid gap-3 rounded-2xl bg-gradient-to-br p-6">
      <p className="font-display text-xl font-bold">✨ {PRO_FEATURE_LABELS[feature]} é do plano Pro</p>
      {children && <div className="text-sm">{children}</div>}
      <Button asChild className="justify-self-start">
        <Link href="/planos">Ver o Pro</Link>
      </Button>
    </div>
  );
}
