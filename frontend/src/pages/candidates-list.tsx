import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Users } from "lucide-react";
import { api, type Candidate } from "@/lib/api";
import { PageBody, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export function CandidatesListPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: async () => (await api.get<Candidate[]>("/candidates")).data,
  });

  const filtered = (data ?? []).filter((c) => {
    if (!q.trim()) return true;
    const blob = `${c.last_name} ${c.first_name} ${c.middle_name ?? ""} ${c.inn ?? ""} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase();
    return blob.includes(q.toLowerCase());
  });

  // Простая статистика для верхушки
  const totals = (data ?? []).reduce(
    (acc, c) => {
      const seg = c.last_run?.risk_segment;
      if (seg === "green") acc.green++;
      else if (seg === "yellow") acc.yellow++;
      else if (seg === "red") acc.red++;
      else acc.unchecked++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0, unchecked: 0 },
  );

  return (
    <>
      <PageHeader
        eyebrow="dossier index"
        title="Кандидаты"
        description="Реестр запросов на проверку, риск-скоринг и аудит источников"
        actions={
          <Link to="/candidates/new">
            <Button variant="primary">
              <Plus size={16} /> Новый кандидат
            </Button>
          </Link>
        }
      />
      <PageBody>
        {/* Stat strip */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Всего" value={data?.length ?? 0} tone="primary" />
          <StatTile label="Green" value={totals.green} tone="green" />
          <StatTile label="Yellow" value={totals.yellow} tone="yellow" />
          <StatTile label="Red" value={totals.red} tone="red" />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <div className="relative max-w-md flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-fg))]"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по ФИО, ИНН, телефону…"
              className="pl-9"
            />
          </div>
          <div className="mono text-[11px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
            {data ? `${filtered.length}/${data.length}` : ""}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            icon={Users}
            title={q ? "Ничего не нашлось" : "Нет кандидатов"}
            description={
              q
                ? "Попробуйте другой запрос или сбросьте фильтр"
                : "Создайте первого кандидата, чтобы запустить проверку"
            }
            action={
              !q && (
                <Link to="/candidates/new">
                  <Button variant="primary">
                    <Plus size={16} /> Создать кандидата
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => (
              <CandidateCard key={c.id} c={c} delay={i * 0.03} />
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "green" | "yellow" | "red";
}) {
  const accent =
    tone === "primary" ? "text-[hsl(var(--primary))]"
  : tone === "green"   ? "text-[hsl(var(--success))]"
  : tone === "yellow"  ? "text-[hsl(var(--warning))]"
                       : "text-[hsl(var(--danger))]";
  const dot =
    tone === "primary" ? "bg-[hsl(var(--primary))]"
  : tone === "green"   ? "bg-[hsl(var(--success))]"
  : tone === "yellow"  ? "bg-[hsl(var(--warning))]"
                       : "bg-[hsl(var(--danger))]";
  return (
    <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
      <div className="mono mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-fg))]">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <div className={`mono text-3xl font-bold tabular-nums ${value === 0 ? "text-[hsl(var(--muted-fg))]" : accent}`}>
        {value}
      </div>
    </div>
  );
}

function CandidateCard({ c, delay }: { c: Candidate; delay: number }) {
  const fullName = `${c.last_name} ${c.first_name}${c.middle_name ? " " + c.middle_name : ""}`;
  const segment = c.last_run?.risk_segment;
  const score = c.last_run?.risk_score;
  const accentRing =
    segment === "green"  ? "ring-[hsl(var(--success))]/30"
  : segment === "yellow" ? "ring-[hsl(var(--warning))]/30"
  : segment === "red"    ? "ring-[hsl(var(--danger))]/30"
                         : "ring-[hsl(var(--border))]";
  const glow =
    segment === "green"  ? "shadow-[0_0_24px_-8px_hsl(var(--success)/0.4)]"
  : segment === "yellow" ? "shadow-[0_0_24px_-8px_hsl(var(--warning)/0.4)]"
  : segment === "red"    ? "shadow-[0_0_24px_-8px_hsl(var(--danger)/0.4)]"
                         : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <Link
        to={`/candidates/${c.id}`}
        className={`group relative block overflow-hidden rounded-xl border bg-[hsl(var(--surface))] p-4 ring-1 ring-inset transition-all hover:border-[hsl(var(--border-strong))] ${accentRing} ${glow}`}
      >
        {/* shimmer on hover */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={fullName} size={42} glow={!!segment} />
            <div className="min-w-0">
              <div className="truncate font-semibold leading-tight">{fullName}</div>
              <div className="mono mt-0.5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                {c.role_segment} · {formatDate(c.created_at)}
              </div>
            </div>
          </div>
          {segment ? (
            <Badge tone={segment} className="shrink-0">{segment}</Badge>
          ) : (
            <Badge tone="outline" className="shrink-0">не проверен</Badge>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[hsl(var(--border))] pt-3">
          <div>
            <div className="mono text-[9px] uppercase tracking-widest text-[hsl(var(--muted-fg))]">
              ИНН
            </div>
            <div className="mono mt-0.5 text-xs">{c.inn ?? "—"}</div>
          </div>
          <div>
            <div className="mono text-[9px] uppercase tracking-widest text-[hsl(var(--muted-fg))]">
              risk
            </div>
            <div className="mono mt-0.5 text-xs tabular-nums">
              {typeof score === "number" ? score : "—"}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
