import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Empty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
          <Icon size={20} className="text-[hsl(var(--muted-fg))]" />
        </div>
      )}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="max-w-sm text-xs text-[hsl(var(--muted-fg))]">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
