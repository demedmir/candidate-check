import { cn } from "@/lib/utils";

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  // Stable color from name
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 30) % 360} 70% 45%))`,
        fontSize: size * 0.4,
      }}
    >
      {initials || "?"}
    </div>
  );
}
