"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  googleAction?: () => Promise<void>;
  next?: string;
};

export function AuthForm({ mode, action, googleAction, next }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const isLogin = mode === "login";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isLogin ? "Entrar no Gabarita" : "Criar conta"}</CardTitle>
        <CardDescription>
          {isLogin ? "Use seu e-mail e senha." : "Comece a montar seu plano até a prova."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          {next && <input type="hidden" name="next" value={next} />}
          {!isLogin && (
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" autoComplete="name" required defaultValue={state.name} key={`n-${state.name}`} />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.email}
              key={`e-${state.email}`}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </div>
          {state.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
          {state.message && <p className="text-sm">{state.message}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        {googleAction && (
          <form action={googleAction}>
            <Button type="submit" variant="outline" className="w-full">
              Continuar com Google
            </Button>
          </form>
        )}
        <p className="text-muted-foreground text-center text-sm">
          {isLogin ? (
            <>
              Não tem conta? <Link className="underline" href="/signup">Criar conta</Link>
            </>
          ) : (
            <>
              Já tem conta? <Link className="underline" href="/login">Entrar</Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
