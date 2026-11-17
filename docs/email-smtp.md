# E-mails de confirmação com SMTP próprio (grátis)

**Por quê:** o Supabase manda os e-mails de confirmação de cadastro pelo servidor de e-mail dele, que aceita só
~2 e-mails por hora. Com uma turma se cadastrando junta, a maioria não recebe o link. Um serviço de e-mail próprio
resolve. Os dois abaixo têm plano gratuito.

| Serviço | Grátis | Observação |
|---|---|---|
| [Brevo](https://www.brevo.com) | 300 e-mails/dia | não exige domínio próprio para começar (usa um remetente verificado) |
| [Resend](https://resend.com) | 3.000 e-mails/mês (100/dia) | exige um domínio seu verificado (DNS) |

Sem domínio próprio, comece pelo **Brevo**.

## Passo a passo (Brevo)

1. Crie a conta em brevo.com e confirme o seu e-mail.
2. Em **Senders, Domains & Dedicated IPs → Senders**, adicione o remetente (ex.: o seu e-mail) e confirme.
3. Em **SMTP & API → SMTP**, gere uma **SMTP key**. Anote: servidor `smtp-relay.brevo.com`, porta `587`, o
   login (aparece na página) e a chave gerada.
4. No Supabase (projeto Gabarita): **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Sender email: o remetente verificado no passo 2
   - Sender name: `Gabarita`
   - Host: `smtp-relay.brevo.com` · Port: `587`
   - Username: o login do passo 3 · Password: a SMTP key
5. Ainda no Supabase, **Authentication → Rate Limits**: suba "Rate limit for sending emails" (ex.: 30 por hora).
6. Teste: crie uma conta nova no site e veja o e-mail chegar.

**Nunca** cole a chave SMTP no chat, no código ou num commit: ela fica só no painel do Supabase.

## Texto do e-mail (opcional)

Em **Authentication → Emails → Templates → Confirm signup**, troque o assunto por "Confirme sua conta no
Gabarita" e o texto por algo como:

```html
<h2>Falta pouco!</h2>
<p>Toque no botão para confirmar o seu e-mail e começar a estudar no Gabarita.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar minha conta</a></p>
<p>Se não foi você que criou a conta, ignore este e-mail.</p>
```
