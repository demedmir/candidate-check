import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      toast.success(`Доступ открыт · ${data.user.full_name}`);
      navigate("/candidates");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Доступ закрыт");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-full place-items-center overflow-hidden p-6">
      {/* Aurora + grid background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute inset-0 bg-aurora" />
        {/* Floating orbs */}
        <motion.div
          className="absolute left-[20%] top-[15%] h-72 w-72 rounded-full bg-[hsl(var(--primary)/0.25)] blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[15%] bottom-[20%] h-80 w-80 rounded-full bg-[hsl(var(--accent)/0.25)] blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px]"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse-soft rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] blur-xl" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white">
              <ShieldCheck size={22} />
            </div>
          </div>
          <div>
            <div className="mono mb-1 text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-fg))]">
              candidate-check / hr
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              <span className="text-gradient">Авторизация</span>
            </h1>
            <p className="mt-1.5 text-sm text-[hsl(var(--muted-fg))]">
              Защищённый кабинет HR-команды
            </p>
          </div>
        </div>

        <div className="glass relative overflow-hidden rounded-2xl p-7">
          {/* Top scan line */}
          <div className="pointer-events-none absolute -top-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent opacity-60" />

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-2 w-full font-semibold"
              disabled={loading}
            >
              {loading ? "Проверяем…" : "Войти →"}
            </Button>
          </form>
        </div>

        <div className="mono mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-fg))]">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ring-pulse rounded-full bg-[hsl(var(--success))]" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
          </span>
          TLS · 152-ФЗ · ru-region
        </div>
      </motion.div>
    </div>
  );
}
