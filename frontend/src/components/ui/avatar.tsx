import { cn } from "@/lib/utils";

export function Avatar({
  name,
  size = 36,
  className,
  glow = false,
}: {
  name: string;
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const initials = (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;

  return (
    <div className="relative inline-block">
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full opacity-50 blur-md"
          style={{
            background: `radial-gradient(circle, hsl(${hue} 100% 60%), transparent 70%)`,
          }}
        />
      )}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
          "ring-1 ring-white/10 ring-inset",
          className,
        )}
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${(hue + 50) % 360} 80% 45%))`,
          fontSize: size * 0.38,
        }}
      >
        {initials || "?"}
      </div>
    </div>
  );
}
