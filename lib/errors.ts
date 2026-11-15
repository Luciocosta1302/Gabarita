/**
 * Erro com mensagem que pode ser mostrada ao aluno e que não adianta tentar de novo
 * (arquivo corrompido, acima do limite do plano, formato não suportado...).
 */
export class UserFacingError extends Error {
  readonly permanent = true;
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export function isUserFacing(e: unknown): e is UserFacingError {
  return e instanceof Error && (e as Partial<UserFacingError>).permanent === true;
}
