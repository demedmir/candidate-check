import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "green" | "yellow" | "red" | "neutral";

const toneToColors: Record<Tone, { stroke: string; glow: string; text: string }> = {
  green: {
    stroke: "hsl(var(--success))",
    glow: "hsl(var(--success) / 0.5)",
    text: "text-[hsl(var(--success))]",
  },
  yellow: {
    stroke: "hsl(var(--warning))",
    glow: "hsl(var(--warning) / 0.5)",
    text: "text-[hsl(var(--warning))]",
  },
  red: {
    stroke: "hsl(var(--danger))",
    glow: "hsl(var(--danger) / 0.5)",
    text: "text-[hsl(var(--danger))]",
  },
  neutral: {
    stroke: "hsl(var(--muted-fg))",
    glow: "transparent",
    text: "text-[hsl(var(--muted-fg))]",
  },
};

const toneToLabel: Record<Tone, string> = {
  green: "ЧИСТ",
  yellow: "ВНИМАНИЕ",
  red: "СТОП",
  neutral: "—",
};

export function RiskGauge({
  segment,
  score,
  size = 140,
}: {
  segment: Tone | null;
  score: number | null;
  size?: number;
}) {
  const tone: Tone = segment ?? "neutral";
  const c = toneToColors[tone];
  const max = 100;
  const value = Math.max(0, Math.min(score ?? 0, max));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Полудуга снизу (от 135° через низ до 45° = 270° дуги) — gauge style
  const arcLength = circumference * 0.75;
  const offset = arcLength * (1 - value / max);

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-[225deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={c.stroke}
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={arcLength}
          strokeLinecap="round"
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${c.glow})` }}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center">
          <div className={cn("mono text-[10px] uppercase tracking-[0.18em]", c.text)}>
            {toneToLabel[tone]}
          </div>
          <div className={cn("mono text-3xl font-bold tabular-nums leading-none", c.text)}>
            {score ?? "—"}
          </div>
          <div className="mono mt-1 text-[9px] uppercase tracking-widest text-[hsl(var(--muted-fg))]">
            risk
          </div>
        </div>
      </div>
    </div>
  );
}
