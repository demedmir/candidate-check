import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme";

export function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data.access_token, data.user);
      toast.success(`Привет, ${data.user.full_name}`);
      navigate("/candidates");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Hero side */}
      <div className="relative hidden flex-col justify-between bg-[hsl(var(--fg))] p-10 text-[hsl(var(--bg))] lg:flex">
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[hsl(var(--bg))] text-[hsl(var(--fg))]">
            <ShieldCheck size={18} />
          </span>
          candidate-check
        </div>
        <div className="space-y-3">
          <p className="text-2xl font-semibold leading-tight tracking-tight">
            Автоматическая проверка кандидатов&nbsp;по&nbsp;открытым&nbsp;РФ-источникам.
          </p>
          <p className="text-sm leading-relaxed opacity-70">
            ФНС НПД, РДЛ, ЕФРСБ, Росфинмониторинг, OpenSanctions. Светофор-скоринг,
            настраиваемые сегменты ролей, JSON API для ATS.
          </p>
        </div>
        <div className="text-xs opacity-50">v0.1 · MVP</div>
      </div>

      {/* Form side */}
      <div className="relative flex items-center justify-center p-6 lg:p-10">
        <div className="absolute right-6 top-6 text-xs">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm space-y-7">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Вход в кабинет</h2>
            <p className="mt-1.5 text-sm text-[hsl(var(--muted-fg))]">
              Используйте учётную запись HR-команды.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? "Вход…" : "Войти"}
            </Button>
          </form>

          <p className="text-center text-xs text-[hsl(var(--muted-fg))]">
            Защищённое подключение по TLS · 152-ФЗ
          </p>
        </div>
      </div>
    </div>
  );
}
