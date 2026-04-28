import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-[13px]",
      "transition-all placeholder:text-[hsl(var(--muted-fg))]",
      "focus:bg-[hsl(var(--surface))] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-[13px]",
      "transition-all focus:bg-[hsl(var(--surface))] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:outline-none",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
