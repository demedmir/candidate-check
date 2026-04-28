import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, LogOut, Moon, ShieldCheck, Sun, Users } from "lucide-react";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV = [{ to: "/candidates", label: "Кандидаты", icon: Users }];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative flex min-h-full">
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-aurora" />
      </div>

      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))]/50 backdrop-blur-xl sm:flex">
        <Link
          to="/candidates"
          className="flex h-14 items-center gap-2.5 border-b border-[hsl(var(--border))] px-5"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)]">
            <ShieldCheck size={16} />
          </span>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight">candidate-check</div>
            <div className="mono text-[9px] uppercase tracking-[0.2em] text-[hsl(var(--muted-fg))]">
              v0.1 · прод
            </div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]"
                    : "text-[hsl(var(--muted-fg))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--fg))]",
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-[hsl(var(--border))] p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-2">
            <Avatar name={user?.full_name || user?.email || "?"} size={32} glow />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.full_name}</p>
              <p className="mono truncate text-[10px] text-[hsl(var(--muted-fg))]">
                {user?.email}
              </p>
            </div>
            <button
              aria-label="logout"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-md p-1.5 text-[hsl(var(--muted-fg))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--fg))]"
            >
              <LogOut size={14} />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-md px-2 py-1">
            <span className="mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--success))]">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ring-pulse rounded-full bg-[hsl(var(--success))]" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
              </span>
              онлайн
            </span>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label="toggle theme"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-fg))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              {isDark ? <Sun size={12} /> : <Moon size={12} />}
              {isDark ? "светлая" : "тёмная"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative flex-1 overflow-x-hidden">
        <Outlet />
      </main>

      <Toaster
        position="bottom-right"
        theme={isDark ? "dark" : "light"}
        toastOptions={{
          style: {
            background: "hsl(var(--surface))",
            color: "hsl(var(--fg))",
            border: "1px solid hsl(var(--border))",
            backdropFilter: "blur(20px)",
          },
        }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]/40 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5">
        <div>
          {eyebrow && (
            <div className="mono mb-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-fg))]">
              <Activity size={10} />
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-[13px] text-[hsl(var(--muted-fg))]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-8 py-7", className)}>{children}</div>;
}
