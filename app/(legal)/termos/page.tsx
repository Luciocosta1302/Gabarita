import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Termos de uso · Gabarita" };

export default function TermosPage() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p className="text-muted-foreground">Atualizados em {LEGAL_UPDATED}.</p>
      <p>Ao criar uma conta no Gabarita, você concorda com estes termos. Eles são curtos, de propósito.</p>

      <h2>1. O que é o Gabarita</h2>
      <p>
        Um aplicativo gratuito de estudo: você envia o seu material e ele gera questões, resumos, flashcards, um plano até a prova e
        revisões. É um projeto em desenvolvimento, oferecido &quot;como está&quot;, sem garantia de funcionamento contínuo; funções podem
        mudar ou sair do ar.
      </p>

      <h2>2. A IA pode errar</h2>
      <p>
        Questões, gabaritos, resumos e correções são feitos por inteligência artificial. Conferimos a fonte e o gabarito de cada
        questão, mas erros ainda podem acontecer. Use o botão &quot;Ver no material&quot; e, na dúvida, confie no seu material e no
        seu professor. O Gabarita não garante aprovação em provas.
      </p>

      <h2>3. Seu material</h2>
      <ul>
        <li>O material continua sendo seu (ou de quem tem os direitos). Você nos autoriza a processá-lo só para fazer o aplicativo funcionar para você.</li>
        <li>Envie apenas o que você tem direito de usar. Não compartilhe em turmas apostilas pagas ou material de terceiros sem autorização.</li>
        <li>Não envie dados pessoais sensíveis seus ou de outras pessoas (veja a <Link href="/privacidade">Política de privacidade</Link>).</li>
      </ul>

      <h2>4. Convivência (Turmas e Comunidade)</h2>
      <ul>
        <li>Seja respeitoso. É proibido assédio, discurso de ódio, conteúdo sexual, golpes, spam, pirataria e se passar por outra pessoa.</li>
        <li>Não use o aplicativo para colar em provas e avaliações em andamento.</li>
        <li>Publicações denunciadas por várias pessoas ficam escondidas até a revisão da moderação, que pode apagá-las ou suspender a conta.</li>
      </ul>

      <h2>5. Uso justo</h2>
      <p>
        A IA usada é gratuita e tem limites. Para todos conseguirem usar, há limites de uso por dia (por exemplo, de vídeos e de
        pedidos à IA). Não tente burlar esses limites nem automatizar o uso.
      </p>

      <h2>6. Menores de idade</h2>
      <p>Menores de 18 anos devem usar com autorização do responsável. Menores de 12 anos não devem criar conta.</p>

      <h2>7. Encerrar a conta</h2>
      <p>
        Você pode apagar a sua conta quando quiser, em <Link href="/perfil#apagar-conta">Perfil → Apagar minha conta</Link>. Podemos
        encerrar contas que desrespeitem estes termos.
      </p>

      <h2>8. Lei aplicável</h2>
      <p>Estes termos seguem as leis do Brasil, incluindo o Código de Defesa do Consumidor e a LGPD.</p>
    </>
  );
}
