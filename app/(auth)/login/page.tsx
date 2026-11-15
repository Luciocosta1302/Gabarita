import { AuthForm } from "@/components/auth/auth-form";

import { login, loginWithGoogle } from "../actions";

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" action={login} googleAction={googleEnabled ? loginWithGoogle : undefined} next={next} />;
}
