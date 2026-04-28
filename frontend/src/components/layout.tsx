import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, Users } from "lucide-react";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV = [{ to: "/candidates", label: "Кандидаты", icon: Users }];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-[hsl(var(--bg))] sm:flex">
        <Link
          to="/candidates"
          className="flex h-14 items-center gap-2 border-b px-5 text-[15px] font-semibold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--fg))] text-[hsl(var(--bg))]">
            <ShieldCheck size={16} />
          </span>
          candidate-check
        </Link>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[hsl(var(--muted))] text-[hsl(var(--fg))]"
                    : "text-[hsl(var(--muted-fg))] hover:bg-[hsl(var(--surface-hover))] hover:text-[hsl(var(--fg))]",
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-2.5 rounded-md p-2">
            <Avatar name={user?.full_name || user?.email || "?"} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.full_name}</p>
              <p className="truncate text-[10px] text-[hsl(var(--muted-fg))]">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="logout"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut size={14} />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-[hsl(var(--muted-fg))]">
            <span>v0.1 • prod</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>

      <Toaster
        position="bottom-right"
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        toastOptions={{
          style: {
            background: "hsl(var(--surface))",
            color: "hsl(var(--fg))",
            border: "1px solid hsl(var(--border))",
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
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b bg-[hsl(var(--bg))]">
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-[hsl(var(--muted-fg))]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-8 py-6", className)}>{children}</div>;
}
