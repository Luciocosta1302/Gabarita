/** Conta de demonstração (login divulgado no README): DEMO_EMAIL no servidor. */
export function isDemoAccount(email: string | null | undefined) {
  const demo = process.env.DEMO_EMAIL?.trim().toLowerCase();
  return !!demo && !!email && email.toLowerCase() === demo;
}
