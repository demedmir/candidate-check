import { Link, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { useAuthStore } from "@/store/auth";

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b bg-[hsl(var(--bg))]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
          <Link to="/" className="font-semibold">
            candidate-check
          </Link>
          <nav className="ml-8 flex gap-4 text-sm text-[hsl(var(--muted-fg))]">
            <Link to="/candidates" className="hover:text-[hsl(var(--fg))]">
              Кандидаты
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-[hsl(var(--muted-fg))]">{user?.email}</span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="logout"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
