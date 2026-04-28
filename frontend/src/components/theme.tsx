import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-[hsl(var(--muted))]"
      aria-label="toggle theme"
    >
      {isDark ? <Sun size={12} /> : <Moon size={12} />}
      <span>{isDark ? "light" : "dark"}</span>
    </button>
  );
}
