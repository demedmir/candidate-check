import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      neutral: "bg-[hsl(var(--muted))] text-[hsl(var(--fg))]",
      green: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
      yellow: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
      red: "bg-[hsl(var(--danger))]/15 text-[hsl(var(--danger))]",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof variants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(variants({ tone }), className)} {...props} />;
}
