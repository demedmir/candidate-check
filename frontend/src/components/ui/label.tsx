import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "mono text-[10px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-fg))]",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
