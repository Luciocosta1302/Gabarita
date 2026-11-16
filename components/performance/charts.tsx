"use client";

import { useState } from "react";

/**
 * Gráficos de série única (sem legenda: o título nomeia a série). Marca na cor primária,
 * grade recessiva, tooltip ao passar o mouse/teclado e tabela com os dados para leitores de tela.
 */

type Point = { label: string; value: number | null; detail: string };

const W = 560;
const H = 200;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

function Frame({ max, format, children }: { max: number; format: (v: number) => string; children: React.ReactNode }) {
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
  return (
    <>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
            {format(t)}
          </text>
        </g>
      ))}
      {children}
    </>
  );
}

function Tooltip({ p }: { p: Point | null }) {
  return (
    <div className="text-muted-foreground h-5 text-xs" aria-live="polite">
      {p ? (
        <>
          <span className="text-foreground font-medium">{p.label}</span> · {p.detail}
        </>
      ) : (
        "Passe o mouse (ou use Tab) sobre o gráfico para ver os valores."
      )}
    </div>
  );
}

function DataTable({ points, header }: { points: Point[]; header: string }) {
  return (
    <details className="text-xs">
      <summary className="text-muted-foreground cursor-pointer">Ver em tabela</summary>
      <table className="mt-2 w-full">
        <thead>
          <tr className="text-left">
            <th className="py-1">Semana</th>
            <th className="py-1">{header}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label} className="border-t">
              <td className="py-1">{p.label}</td>
              <td className="py-1">{p.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function BarChart({ points, title, unit }: { points: Point[]; title: string; unit: string }) {
  const [hover, setHover] = useState<Point | null>(null);
  const max = Math.max(4, ...points.map((p) => p.value ?? 0));
  const n = points.length;
  const band = (W - PAD.left - PAD.right) / n;
  const barW = Math.min(28, band * 0.55);
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
  return (
    <figure className="grid gap-2" data-testid="chart-bars">
      <figcaption className="font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        <Frame max={max} format={(v) => String(Math.round(v))}>
          {points.map((p, i) => {
            const v = p.value ?? 0;
            const x = PAD.left + band * i + (band - barW) / 2;
            const top = y(v);
            const base = y(0);
            const r = Math.min(4, (base - top) / 2);
            // topo arredondado (4px), base reta apoiada no eixo
            const d = v > 0 ? `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z` : "";
            return (
              <g key={p.label}>
                {d && <path d={d} fill="var(--primary)" opacity={hover && hover !== p ? 0.55 : 1} />}
                {/* alvo de toque maior que a barra */}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={H - PAD.top - PAD.bottom}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${p.label}: ${p.detail}`}
                  onMouseEnter={() => setHover(p)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(p)}
                  onBlur={() => setHover(null)}
                />
                <text x={PAD.left + band * i + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                  {p.label}
                </text>
              </g>
            );
          })}
        </Frame>
      </svg>
      <Tooltip p={hover} />
      <DataTable points={points} header={unit} />
    </figure>
  );
}

export function LineChart({ points, title, unit }: { points: Point[]; title: string; unit: string }) {
  const [hover, setHover] = useState<Point | null>(null);
  const max = 100;
  const n = points.length;
  const band = (W - PAD.left - PAD.right) / n;
  const x = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
  // a linha só liga semanas com dados (semana sem resposta = falha na linha)
  const segments: string[] = [];
  let cur = "";
  points.forEach((p, i) => {
    if (p.value == null) {
      if (cur) segments.push(cur);
      cur = "";
      return;
    }
    cur += `${cur ? "L" : "M"}${x(i)},${y(p.value)} `;
  });
  if (cur) segments.push(cur);
  return (
    <figure className="grid gap-2" data-testid="chart-line">
      <figcaption className="font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        <Frame max={max} format={(v) => `${Math.round(v)}%`}>
          {segments.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hover && hover.value != null && (
            <line
              x1={x(points.indexOf(hover))}
              x2={x(points.indexOf(hover))}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          {points.map((p, i) => (
            <g key={p.label}>
              {p.value != null && <circle cx={x(i)} cy={y(p.value)} r={4} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={H - PAD.top - PAD.bottom}
                fill="transparent"
                tabIndex={0}
                aria-label={`${p.label}: ${p.detail}`}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(p)}
                onBlur={() => setHover(null)}
              />
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                {p.label}
              </text>
            </g>
          ))}
        </Frame>
      </svg>
      <Tooltip p={hover} />
      <DataTable points={points} header={unit} />
    </figure>
  );
}
