"use client";

import { useState } from "react";
import { SnapshotCmv } from "@/types";

interface Props {
  snapshots: SnapshotCmv[];
  metaCmv: number;
}

const W = 800;
const H = 280;
const PAD = { top: 20, right: 24, bottom: 44, left: 52 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function CmvLineChart({ snapshots, metaCmv }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (snapshots.length === 0) return null;

  const values = snapshots.map((s) => s.cmvMedio ?? 0);
  const allValues = [...values, metaCmv];
  const minY = Math.max(0, Math.floor(Math.min(...allValues) - 5));
  const maxY = Math.ceil(Math.max(...allValues) + 5);
  const yRange = maxY - minY || 1;

  function px(i: number) {
    if (snapshots.length === 1) return PAD.left + CW / 2;
    return PAD.left + (i / (snapshots.length - 1)) * CW;
  }
  function py(v: number) {
    return PAD.top + CH - ((v - minY) / yRange) * CH;
  }

  // Y gridlines every 5%
  const gridValues: number[] = [];
  for (let v = Math.ceil(minY / 5) * 5; v <= maxY; v += 5) gridValues.push(v);

  const polyPoints = snapshots
    .map((s, i) => `${px(i)},${py(s.cmvMedio ?? 0)}`)
    .join(" ");

  const metaY = py(metaCmv);
  const hover = hoverIdx !== null ? snapshots[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? px(hoverIdx) : 0;
  const hoverY = hover ? py(hover.cmvMedio ?? 0) : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="select-none"
        style={{ minWidth: 300 }}
      >
        {/* Grid lines */}
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left} y1={py(v)} x2={PAD.left + CW} y2={py(v)}
              stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
            />
            <text
              x={PAD.left - 6} y={py(v)} textAnchor="end" dominantBaseline="middle"
              fontSize={10} fill="currentColor" opacity={0.45}
            >
              {v}%
            </text>
          </g>
        ))}

        {/* Meta CMV dashed line */}
        <line
          x1={PAD.left} y1={metaY} x2={PAD.left + CW} y2={metaY}
          stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,4" opacity={0.7}
        />
        <text
          x={PAD.left + CW + 4} y={metaY} dominantBaseline="middle"
          fontSize={9} fill="#d97706" opacity={0.9}
        >
          meta {metaCmv}%
        </text>

        {/* Polyline */}
        {snapshots.length > 1 && (
          <polyline
            points={polyPoints}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Dots + hover zones */}
        {snapshots.map((s, i) => {
          const x = px(i);
          const y = py(s.cmvMedio ?? 0);
          const over = s.cmvMedio !== null && s.cmvMedio > metaCmv;
          const isHover = hoverIdx === i;
          return (
            <g key={s.id}>
              {/* Invisible hit area */}
              <rect
                x={x - 20} y={PAD.top} width={40} height={CH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              <circle
                cx={x} cy={y} r={isHover ? 6 : 4}
                fill={over ? "#ef4444" : "#22c55e"}
                stroke="white" strokeWidth={2}
                className="transition-all duration-100 pointer-events-none"
              />
            </g>
          );
        })}

        {/* X axis labels */}
        {snapshots.map((s, i) => {
          const x = px(i);
          // Show every label if ≤10 snapshots, else skip some
          const show = snapshots.length <= 10 || i % Math.ceil(snapshots.length / 10) === 0 || i === snapshots.length - 1;
          if (!show) return null;
          return (
            <text
              key={s.id}
              x={x} y={PAD.top + CH + 16}
              textAnchor="middle" fontSize={10}
              fill="currentColor" opacity={0.45}
            >
              {fmt(s.registradoEm)}
            </text>
          );
        })}

        {/* Hover tooltip */}
        {hover && hoverIdx !== null && (() => {
          const tipW = 140;
          const tipH = 72;
          const tipX = Math.min(Math.max(hoverX - tipW / 2, PAD.left), PAD.left + CW - tipW);
          const tipY = hoverY - tipH - 12 < PAD.top
            ? hoverY + 12
            : hoverY - tipH - 12;
          const over = hover.cmvMedio !== null && hover.cmvMedio > metaCmv;
          return (
            <g className="pointer-events-none">
              <rect
                x={tipX} y={tipY} width={tipW} height={tipH} rx={6}
                fill="white" stroke="#e5e7eb" strokeWidth={1}
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}
              />
              <text x={tipX + 10} y={tipY + 18} fontSize={11} fontWeight="600" fill="#111">
                {new Date(hover.registradoEm).toLocaleDateString("pt-BR")}
              </text>
              <text x={tipX + 10} y={tipY + 34} fontSize={11} fill={over ? "#ef4444" : "#16a34a"} fontWeight="600">
                CMV: {hover.cmvMedio !== null ? `${hover.cmvMedio.toFixed(1)}%` : "—"}
              </text>
              <text x={tipX + 10} y={tipY + 50} fontSize={10} fill="#6b7280">
                {hover.acimaDaMeta} produto{hover.acimaDaMeta !== 1 ? "s" : ""} acima da meta
              </text>
              <text x={tipX + 10} y={tipY + 64} fontSize={10} fill="#6b7280">
                Meta: {hover.metaCmv}%
              </text>
            </g>
          );
        })()}

        {/* Axes */}
        <line
          x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH}
          stroke="currentColor" strokeOpacity={0.15} strokeWidth={1}
        />
        <line
          x1={PAD.left} y1={PAD.top + CH} x2={PAD.left + CW} y2={PAD.top + CH}
          stroke="currentColor" strokeOpacity={0.15} strokeWidth={1}
        />
      </svg>
    </div>
  );
}
