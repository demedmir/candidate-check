import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
  {
    variants: {
      tone: {
        neutral:
          "bg-[hsl(var(--muted))] text-[hsl(var(--muted-fg))] ring-1 ring-inset ring-[hsl(var(--border))]",
        outline:
          "border border-[hsl(var(--border-strong))] text-[hsl(var(--muted-fg))]",
        green:
          "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))] ring-1 ring-inset ring-[hsl(var(--success))]/30",
        yellow:
          "bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))] ring-1 ring-inset ring-[hsl(var(--warning))]/30",
        red:
          "bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger))] ring-1 ring-inset ring-[hsl(var(--danger))]/30",
        primary:
          "bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] ring-1 ring-inset ring-[hsl(var(--primary))]/30",
        accent:
          "bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent))] ring-1 ring-inset ring-[hsl(var(--accent))]/30",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof variants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(variants({ tone }), className)} {...props} />;
}

export function StatusDot({ tone }: { tone: "green" | "yellow" | "red" | "neutral" }) {
  const c =
    tone === "green"
      ? "bg-[hsl(var(--success))]"
      : tone === "yellow"
      ? "bg-[hsl(var(--warning))]"
      : tone === "red"
      ? "bg-[hsl(var(--danger))]"
      : "bg-[hsl(var(--muted-fg))]";
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ring-pulse", c)} />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", c)} />
    </span>
  );
}
