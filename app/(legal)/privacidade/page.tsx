import type { Metadata } from "next";
import Link from "next/link";

import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidade · Gabarita" };

export default function PrivacidadePage() {
  return (
    <>
      <h1>Política de privacidade</h1>
      <p className="text-muted-foreground">Atualizada em {LEGAL_UPDATED}.</p>
      <p>
        O Gabarita é um aplicativo de estudo. Esta página explica, em linguagem simples, quais dados guardamos, para quê, com quem
        eles são compartilhados e como você pode apagá-los, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>1. Quais dados guardamos</h2>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail e senha (a senha é guardada criptografada; ninguém consegue lê-la).</li>
        <li><strong>Perfil (opcional):</strong> @, bio, personagem, objetivo de estudo e estado/cidade nas Notícias.</li>
        <li><strong>Material de estudo:</strong> arquivos, fotos, áudios, links e textos que você envia, e o texto extraído deles.</li>
        <li><strong>Estudo:</strong> questões, respostas, nível de confiança, tempo de resposta, revisões, plano, anotações, diário e conversas com a IA.</li>
        <li><strong>Turmas e Comunidade:</strong> o que você publica e compartilha com outras pessoas.</li>
        <li><strong>Uso técnico:</strong> contagem de uso da IA por dia e limites de requisição, para o serviço não ser abusado.</li>
      </ul>
      <p>Não usamos cookies de publicidade nem rastreadores de terceiros. Os únicos cookies mantêm você conectado.</p>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Fazer o aplicativo funcionar: ler o seu material, criar questões, resumos e flashcards, montar o plano e mostrar o seu progresso (base legal: execução do serviço que você pediu).</li>
        <li>Segurança: impedir abuso, spam e acesso indevido (base legal: legítimo interesse).</li>
      </ul>
      <p>Não vendemos seus dados e não os usamos para publicidade.</p>

      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Google (Gemini):</strong> o texto do seu material, suas perguntas e respostas são enviados à IA do Google para gerar
          questões, resumos e correções. O aplicativo usa o plano gratuito da API do Gemini; nesse plano, <strong>o Google pode usar
          o conteúdo enviado para melhorar os produtos dele</strong>. Por isso, <strong>não envie dados pessoais sensíveis</strong>
          (documentos, saúde, dados de outras pessoas) como material de estudo.
        </li>
        <li><strong>Supabase:</strong> banco de dados, arquivos e login (servidores no Canadá).</li>
        <li><strong>Vercel:</strong> hospedagem do site.</li>
        <li><strong>Outros alunos:</strong> só o que você escolher compartilhar numa turma ou publicar na Comunidade. Seu perfil (@, bio, personagem, XP) só aparece para colegas de turma.</li>
      </ul>

      <h2>4. Menores de idade</h2>
      <p>
        Se você tem menos de 18 anos, use o Gabarita com o conhecimento e a autorização do seu pai, mãe ou responsável. Menores de 12
        anos não devem criar conta.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>Enquanto a sua conta existir. Ao apagar a conta, apagamos tudo o que é seu na hora (ver abaixo).</p>

      <h2>6. Seus direitos</h2>
      <p>Pela LGPD, você pode ver, corrigir, levar e apagar seus dados. No próprio aplicativo:</p>
      <ul>
        <li><strong>Corrigir:</strong> em Perfil, edite nome, @, bio e personagem.</li>
        <li><strong>Apagar um item:</strong> pastas, materiais, anotações, posts e conversas têm o botão de apagar.</li>
        <li>
          <strong>Apagar tudo:</strong> em <Link href="/perfil#apagar-conta">Perfil → Apagar minha conta</Link>. Apaga a conta, os arquivos
          e todos os dados de estudo de forma definitiva. Turmas que você criou também são apagadas.
        </li>
      </ul>
      <p>
        Para outros pedidos (por exemplo, uma cópia dos seus dados)
        {CONTACT_EMAIL ? (
          <>, escreva para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
        ) : (
          <>, fale com o responsável pelo projeto pelo canal informado na página inicial.</>
        )}
      </p>

      <h2>7. Segurança</h2>
      <p>
        Conexão sempre criptografada (HTTPS), cada aluno só acessa os próprios dados (regras no banco de dados), arquivos em área
        privada e limites contra abuso. Nenhum sistema é 100% seguro: se algo acontecer, avisaremos quem foi afetado.
      </p>

      <h2>8. Mudanças</h2>
      <p>Se esta política mudar, a data no topo muda e, se a mudança for importante, avisaremos no aplicativo.</p>
    </>
  );
}
