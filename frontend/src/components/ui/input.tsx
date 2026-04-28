import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border bg-[hsl(var(--surface))] px-3 py-1 text-sm",
      "transition-all placeholder:text-[hsl(var(--muted-fg))]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/30 focus-visible:border-[hsl(var(--primary))]",
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
      "flex h-9 w-full rounded-md border bg-[hsl(var(--surface))] px-3 py-1 text-sm",
      "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/30 focus-visible:border-[hsl(var(--primary))]",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
