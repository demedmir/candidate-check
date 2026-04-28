import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--fg))] text-[hsl(var(--bg))] hover:opacity-90 shadow-sm",
        primary:
          "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.7)]",
        outline:
          "border border-[hsl(var(--border-strong))] bg-[hsl(var(--surface))] hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--surface-2))]",
        ghost: "hover:bg-[hsl(var(--muted))]",
        danger:
          "bg-[hsl(var(--danger))] text-white hover:brightness-110 shadow-sm",
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
