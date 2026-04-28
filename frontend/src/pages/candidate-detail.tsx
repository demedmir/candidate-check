import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  CircleX,
  Copy,
  Database,
  Loader2,
  Mail,
  Phone,
  Play,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type Candidate,
  type CheckResult,
  type CheckRunDetail,
  type CheckRunSummary,
  type ConnectorInfo,
} from "@/lib/api";
import { PageBody, PageHeader } from "@/components/layout";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import { RiskGauge } from "@/components/ui/risk-gauge";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const candidateId = Number(id);
  const qc = useQueryClient();

  const { data: cand } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: async () => (await api.get<Candidate>(`/candidates/${candidateId}`)).data,
    refetchInterval: (q) => (q.state.data?.last_run?.status === "running" ? 2000 : false),
  });

  const { data: connectors = [] } = useQuery({
    queryKey: ["connectors"],
    queryFn: async () => (await api.get<ConnectorInfo[]>("/connectors")).data,
    staleTime: 60_000,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["runs", candidateId],
    queryFn: async () => (await api.get<CheckRunSummary[]>(`/candidates/${candidateId}/runs`)).data,
    refetchInterval: 4000,
  });

  const lastRunId = runs[0]?.id;
  const { data: lastRun } = useQuery({
    queryKey: ["run", candidateId, lastRunId],
    queryFn: async () => (await api.get<CheckRunDetail>(`/candidates/${candidateId}/runs/${lastRunId}`)).data,
    enabled: !!lastRunId,
    refetchInterval: (q) => (q.state.data?.status === "running" ? 2000 : false),
  });

  const runDetailQueries = useQueries({
    queries: runs.map((r) => ({
      queryKey: ["run", candidateId, r.id],
      queryFn: async () =>
        (await api.get<CheckRunDetail>(`/candidates/${candidateId}/runs/${r.id}`)).data,
      staleTime: 30_000,
    })),
  });
  const allRunsDetail = runDetailQueries
    .map((q) => q.data)
    .filter((d): d is CheckRunDetail => !!d);

  const bySource = useMemo(() => {
    const map = new Map<string, Array<{ run: CheckRunDetail; result: CheckResult }>>();
    for (const run of allRunsDetail) {
      for (const result of run.results) {
        if (!map.has(result.source)) map.set(result.source, []);
        map.get(result.source)!.push({ run, result });
      }
    }
    for (const arr of map.values()) arr.sort((a, b) => b.run.id - a.run.id);
    return map;
  }, [allRunsDetail]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const runCheck = useMutation({
    mutationFn: async () => {
      await api.post(`/candidates/${candidateId}/check`, {
        connector_keys: selected.size ? [...selected] : null,
      });
    },
    onSuccess: () => {
      toast.success("Сканирование запущено");
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      qc.invalidateQueries({ queryKey: ["runs", candidateId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Не удалось запустить"),
  });

  if (!cand) {
    return (
      <>
        <PageHeader title="…" />
        <PageBody><Skeleton className="h-32 rounded-xl" /></PageBody>
      </>
    );
  }

  const fullName = `${cand.last_name} ${cand.first_name}${cand.middle_name ? " " + cand.middle_name : ""}`;
  const allSelected = selected.size === 0 || selected.size === connectors.length;
  const isRunning = lastRun?.status === "running";

  return (
    <>
      <PageHeader
        eyebrow={`dossier #${cand.id}`}
        title={fullName}
        description={`ИНН ${cand.inn ?? "—"}  ·  ДР ${formatDate(cand.birth_date)}  ·  ${cand.role_segment}`}
        actions={
          <Link to="/candidates">
            <Button variant="ghost"><ChevronLeft size={16} /> К списку</Button>
          </Link>
        }
      />
      <PageBody>
        {/* Hero: Avatar + Risk Gauge + Quick info */}
        <Card className="mb-6 overflow-hidden">
          {isRunning && (
            <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
              <div className="h-full w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" />
            </div>
          )}
          <div className="grid items-center gap-5 p-6 md:grid-cols-[auto_1fr_auto]">
            <div className="flex items-center gap-4">
              <Avatar name={fullName} size={72} glow />
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold leading-tight">{fullName}</h2>
                <div className="flex flex-wrap gap-2">
                  {cand.consent_signed_offline ? (
                    <Badge tone="green">согласие ✓</Badge>
                  ) : (
                    <Badge tone="red">без согласия</Badge>
                  )}
                  <Badge tone="primary">{cand.role_segment}</Badge>
                </div>
                <div className="mono flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                  {cand.phone && <span className="inline-flex items-center gap-1"><Phone size={10} /> {cand.phone}</span>}
                  {cand.email && <span className="inline-flex items-center gap-1"><Mail size={10} /> {cand.email}</span>}
                  <span>создан {formatDate(cand.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="hidden md:block" />

            <div className="flex items-center justify-center md:justify-end">
              <RiskGauge
                segment={(lastRun?.risk_segment ?? null) as any}
                score={lastRun?.risk_score ?? null}
                size={140}
              />
            </div>
          </div>
        </Card>

        {/* Run check */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex-1">
              <CardTitle>Сканирование</CardTitle>
              <p className="mono mt-0.5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                {selected.size === 0 ? "запустится по всем источникам" : `выбрано ${selected.size} / ${connectors.length}`}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => runCheck.mutate()}
              disabled={!cand.consent_signed_offline || runCheck.isPending || isRunning}
            >
              {runCheck.isPending || isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isRunning ? "Сканирую…" : runCheck.isPending ? "Запуск…" : "Запустить"}
            </Button>
          </CardHeader>
          <CardContent>
            {!cand.consent_signed_offline ? (
              <p className="text-sm text-[hsl(var(--warning))]">⚠ Согласие на ПДн не отмечено — запуск заблокирован.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {connectors.map((c) => {
                  const checked = allSelected || selected.has(c.key);
                  return (
                    <label
                      key={c.key}
                      className={cn(
                        "group flex cursor-pointer items-center gap-2.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2.5 text-sm transition-all",
                        checked
                          ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary-soft))]/40 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.4)]"
                          : "bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--border-strong))]",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const s = new Set(selected.size === 0 ? connectors.map((x) => x.key) : selected);
                          if (e.target.checked) s.add(c.key); else s.delete(c.key);
                          setSelected(s.size === connectors.length ? new Set() : s);
                        }}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                      <div className="min-w-0">
                        <div className="font-medium leading-tight">{c.title}</div>
                        <div className="mono text-[9px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">{c.key}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last run details */}
        {lastRun && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex-1">
                <CardTitle>
                  Запуск #{lastRun.id}
                  <span className="mono ml-2 text-[10px] font-normal uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                    {lastRun.status === "running" ? (
                      <span className="inline-flex items-center gap-1 text-[hsl(var(--primary))]">
                        <StatusDot tone="yellow" /> сканирование
                      </span>
                    ) : (
                      <>{formatDateTime(lastRun.started_at)} → {formatDateTime(lastRun.finished_at)}</>
                    )}
                  </span>
                </CardTitle>
              </div>
              {lastRun.risk_segment && (
                <Badge tone={lastRun.risk_segment as any}>
                  {lastRun.risk_segment} · score {lastRun.risk_score}
                </Badge>
              )}
            </CardHeader>

            <div className="grid grid-cols-2 gap-px border-b border-[hsl(var(--border))] bg-[hsl(var(--border))] sm:grid-cols-4">
              {summarize(lastRun.results).map((s) => <SummaryStat key={s.label} {...s} />)}
            </div>

            <CardContent className="p-0">
              <div className="divide-y divide-[hsl(var(--border))]">
                {lastRun.results.map((r) => <ResultRow key={r.source} r={r} />)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* By source */}
        {bySource.size > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex-1">
                <CardTitle>По источникам</CardTitle>
                <p className="mono mt-0.5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                  агрегация всех проверок · drill-in для raw-данных
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[hsl(var(--border))]">
                {connectors
                  .map((c) => ({ connector: c, history: bySource.get(c.key) ?? [] }))
                  .filter((g) => g.history.length > 0)
                  .map(({ connector, history }) => (
                    <SourceGroup key={connector.key} connector={connector} history={history} />
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Run history */}
        <Card>
          <CardHeader>
            <div className="flex-1"><CardTitle>История запусков</CardTitle></div>
          </CardHeader>
          <CardContent className="p-0">
            {runs.length === 0 ? (
              <Empty
                icon={ScrollText}
                title="Запусков ещё нет"
                description="Запустите первое сканирование, чтобы получить риск-скор"
                className="border-none py-12"
              />
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]">
                  <tr className="mono text-left text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                    <th className="px-5 py-2.5 font-medium">#</th>
                    <th className="px-5 py-2.5 font-medium">Сегмент</th>
                    <th className="px-5 py-2.5 font-medium">Score</th>
                    <th className="px-5 py-2.5 font-medium">Статус</th>
                    <th className="px-5 py-2.5 font-medium">Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b border-[hsl(var(--border))] last:border-0">
                      <td className="mono px-5 py-2.5 text-xs">#{r.id}</td>
                      <td className="px-5 py-2.5">
                        {r.risk_segment ? <Badge tone={r.risk_segment as any}>{r.risk_segment}</Badge> : <span className="text-xs text-[hsl(var(--muted-fg))]">—</span>}
                      </td>
                      <td className="mono px-5 py-2.5 tabular-nums">{r.risk_score ?? "—"}</td>
                      <td className="mono px-5 py-2.5 text-[11px] uppercase tracking-wider">{r.status}</td>
                      <td className="mono px-5 py-2.5 text-[11px] text-[hsl(var(--muted-fg))]">
                        {formatDateTime(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

/* ── helpers ─────────────────────────────────────────────────────── */

type StatusKey = "ok" | "warning" | "fail" | "error";

const STATUS_META: Record<StatusKey, {
  label: string;
  iconBg: string;
  badgeTone: "green" | "yellow" | "red" | "neutral";
  Icon: typeof CheckCircle2;
}> = {
  ok:      { label: "Пройдено",        iconBg: "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]", badgeTone: "green",   Icon: CheckCircle2 },
  warning: { label: "Требует внимания", iconBg: "bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]", badgeTone: "yellow",  Icon: CircleAlert  },
  fail:    { label: "Не пройдено",     iconBg: "bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger))]",   badgeTone: "red",     Icon: CircleX     },
  error:   { label: "Ошибка проверки", iconBg: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-fg))]",       badgeTone: "neutral", Icon: CircleAlert  },
};

function summarize(results: CheckResult[]) {
  const count = (s: StatusKey) => results.filter((r) => r.status === s).length;
  return (["ok", "warning", "fail", "error"] as StatusKey[]).map((s) => ({
    label: STATUS_META[s].label,
    value: count(s),
    tone: STATUS_META[s].badgeTone,
  }));
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: "green" | "yellow" | "red" | "neutral" }) {
  const accent =
    tone === "green"  ? "text-[hsl(var(--success))]"
  : tone === "yellow" ? "text-[hsl(var(--warning))]"
  : tone === "red"    ? "text-[hsl(var(--danger))]"
                      : "text-[hsl(var(--muted-fg))]";
  return (
    <div className="bg-[hsl(var(--surface))] px-5 py-3">
      <div className="mono text-[9px] uppercase tracking-[0.2em] text-[hsl(var(--muted-fg))]">{label}</div>
      <div className={cn("mono mt-0.5 text-2xl font-bold tracking-tight tabular-nums", value === 0 ? "text-[hsl(var(--muted-fg))]" : accent)}>
        {value}
      </div>
    </div>
  );
}

function ResultRow({ r }: { r: CheckResult }) {
  const meta = STATUS_META[r.status as StatusKey] ?? STATUS_META.error;
  const Icon = meta.Icon;
  const [open, setOpen] = useState(false);
  const hasPayload = r.payload && Object.keys(r.payload).length > 0;
  const hasDetails = hasPayload || !!r.error;

  return (
    <div className={cn("transition-colors", open && "bg-[hsl(var(--surface-2))]")}>
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors",
          hasDetails && "hover:bg-[hsl(var(--surface-2))] cursor-pointer",
          !hasDetails && "cursor-default",
        )}
        onClick={() => hasDetails && setOpen((o) => !o)}
        disabled={!hasDetails}
      >
        <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", meta.iconBg)}>
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.badgeTone}>{meta.label}</Badge>
            <span className="mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">{r.source}</span>
            {r.duration_ms != null && (
              <span className="mono text-[10px] text-[hsl(var(--muted-fg))]">{r.duration_ms}ms</span>
            )}
            {hasDetails && (
              <ChevronDown size={12} className={cn("ml-auto text-[hsl(var(--muted-fg))] transition-transform", open && "rotate-180")} />
            )}
          </div>
          <p className="mt-1 text-sm leading-snug">{r.summary}</p>
        </div>
      </button>
      <AnimatePresence>
        {open && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-[hsl(var(--border))] px-5 pb-4 pt-3">
              {hasPayload && <PayloadView payload={r.payload} />}
              {r.error && (
                <div>
                  <div className="mono mb-1 text-[10px] uppercase tracking-wider text-[hsl(var(--danger))]">Ошибка</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-[hsl(var(--danger-soft))] p-3 text-[11px] text-[hsl(var(--danger))]">{r.error}</pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PayloadView({ payload }: { payload: Record<string, unknown> }) {
  const json = JSON.stringify(payload, null, 2);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">Данные ответа</div>
        <button
          type="button"
          className="mono inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))] transition-colors hover:text-[hsl(var(--fg))]"
          onClick={() => { navigator.clipboard.writeText(json); toast.success("Скопировано"); }}
        >
          <Copy size={11} /> json
        </button>
      </div>
      <pre className="mono max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-3 text-[11px]">{json}</pre>
      <SmartHints payload={payload} />
    </div>
  );
}

function SmartHints({ payload }: { payload: Record<string, unknown> }) {
  const url = (payload as any).manual_url;
  const matches = (payload as any).matches as unknown[] | undefined;
  const total = (payload as any).total;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {url && typeof url === "string" && (
        <a href={url} target="_blank" rel="noreferrer"
          className="mono inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-[hsl(var(--surface-2))]">
          источник ↗
        </a>
      )}
      {typeof total === "number" && (
        <span className="mono rounded-md bg-[hsl(var(--muted))] px-2 py-1 text-[10px] uppercase tracking-wider">
          совпадений: {total}
        </span>
      )}
      {Array.isArray(matches) && matches.length > 0 && (
        <span className="mono rounded-md bg-[hsl(var(--muted))] px-2 py-1 text-[10px] uppercase tracking-wider">
          в выборке: {matches.length}
        </span>
      )}
    </div>
  );
}

function SourceGroup({
  connector,
  history,
}: {
  connector: ConnectorInfo;
  history: Array<{ run: CheckRunDetail; result: CheckResult }>;
}) {
  const [open, setOpen] = useState(false);
  const latest = history[0];
  const meta = STATUS_META[latest.result.status as StatusKey] ?? STATUS_META.error;

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[hsl(var(--surface-2))]"
        onClick={() => setOpen((o) => !o)}
      >
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.iconBg)}>
          <Database size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{connector.title}</span>
            <span className="mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">{connector.key}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={meta.badgeTone}>{meta.label}</Badge>
            <span className="mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
              #{latest.run.id} · {formatDateTime(latest.run.created_at)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="mono text-[9px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">проверок</div>
          <div className="mono text-sm tabular-nums">{history.length}</div>
        </div>
        <ChevronDown size={14} className={cn("text-[hsl(var(--muted-fg))] transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]"
          >
            <div>
              {history.map(({ run, result }) => (
                <SourceHistoryItem key={run.id} runId={run.id} runDate={run.created_at} result={result} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SourceHistoryItem({
  runId,
  runDate,
  result,
}: {
  runId: number;
  runDate: string;
  result: CheckResult;
}) {
  const meta = STATUS_META[result.status as StatusKey] ?? STATUS_META.error;
  const [open, setOpen] = useState(false);
  const hasPayload = result.payload && Object.keys(result.payload).length > 0;
  const hasDetails = hasPayload || !!result.error;
  const Icon = meta.Icon;

  return (
    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
      <button
        type="button"
        className={cn("flex w-full items-start gap-3 px-5 py-2.5 text-left text-sm",
          hasDetails && "hover:bg-[hsl(var(--surface-2))] cursor-pointer")}
        onClick={() => hasDetails && setOpen((o) => !o)}
        disabled={!hasDetails}
      >
        <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", meta.iconBg)}>
          <Icon size={12} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.badgeTone}>{meta.label}</Badge>
            <span className="mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">#{runId}</span>
            <span className="mono text-[10px] text-[hsl(var(--muted-fg))]">{formatDateTime(runDate)}</span>
          </div>
          <p className="mt-0.5 leading-snug">{result.summary}</p>
        </div>
        {hasDetails && (
          <ChevronDown size={12} className={cn("mt-1 text-[hsl(var(--muted-fg))] transition-transform", open && "rotate-180")} />
        )}
      </button>
      {open && hasDetails && (
        <div className="space-y-2 border-t border-[hsl(var(--border))] px-5 pb-3 pt-2">
          {hasPayload && <PayloadView payload={result.payload} />}
          {result.error && (
            <pre className="mono overflow-x-auto whitespace-pre-wrap rounded-md bg-[hsl(var(--danger-soft))] p-2 text-[11px] text-[hsl(var(--danger))]">{result.error}</pre>
          )}
        </div>
      )}
    </div>
  );
}
