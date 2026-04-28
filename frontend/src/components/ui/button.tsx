import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--fg))] text-[hsl(var(--bg))] hover:opacity-90 shadow-[var(--shadow-sm)]",
        primary:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-fg))] hover:brightness-110 shadow-[var(--shadow-sm)]",
        outline:
          "border bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-hover))] hover:border-[hsl(var(--border-strong))]",
        ghost: "hover:bg-[hsl(var(--muted))]",
        danger:
          "bg-[hsl(var(--danger))] text-white hover:brightness-110 shadow-[var(--shadow-sm)]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
