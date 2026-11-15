import { AuthForm } from "@/components/auth/auth-form";

import { loginWithGoogle, signup } from "../actions";

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export default function SignupPage() {
  return <AuthForm mode="signup" action={signup} googleAction={googleEnabled ? loginWithGoogle : undefined} />;
}
