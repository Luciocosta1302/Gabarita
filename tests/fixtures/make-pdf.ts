/**
 * Gera um PDF simples (texto em Helvetica, uma string por página) sem dependências,
 * para testar a extração e o fluxo de ponta a ponta.
 */
function escapePdf(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, width = 90): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > width) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  return lines;
}

export function makePdf(pages: string[]): Buffer {
  const objects: string[] = [];
  const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ");
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  pages.forEach((text, i) => {
    const body = wrap(text)
      .map((l) => `(${escapePdf(l)}) '`)
      .join("\n");
    const stream = `BT /F1 11 Tf 14 TL 50 800 Td\n${body}\nET`;
    objects[4 + i * 2] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    objects[5 + i * 2] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let n = 1; n < objects.length; n++) {
    offsets[n] = Buffer.byteLength(out, "latin1");
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let n = 1; n < objects.length; n++) out += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** Texto de estudo sintético e variado por página (para questões caírem em trechos diferentes). */
const TOPICS = [
  "A fotossíntese ocorre nos cloroplastos e transforma energia luminosa em energia química.",
  "A respiração celular acontece nas mitocôndrias e libera energia na forma de ATP.",
  "O DNA é formado por nucleotídeos e guarda a informação genética da célula.",
  "A mitose produz duas células-filhas geneticamente idênticas à célula-mãe.",
  "A meiose reduz pela metade o número de cromossomos e gera variabilidade genética.",
  "As enzimas são proteínas que aceleram reações químicas sem serem consumidas.",
  "O ciclo de Krebs ocorre na matriz mitocondrial e produz NADH e FADH2.",
  "A membrana plasmática é formada por uma bicamada de fosfolipídios com proteínas.",
  "O ribossomo é a organela responsável pela síntese de proteínas.",
  "A osmose é a passagem de água do meio menos concentrado para o mais concentrado.",
];

export function studyPages(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const t = TOPICS[i % TOPICS.length];
    const filler = Array.from(
      { length: 9 },
      (_, j) =>
        `Na página ${i + 1}, o parágrafo ${j + 1} explica com detalhes que ${t.charAt(0).toLowerCase()}${t.slice(1, -1)}, e isso costuma cair em provas de biologia.`,
    ).join(" ");
    return `Capítulo ${i + 1}. ${t}\n${filler}`;
  });
}
