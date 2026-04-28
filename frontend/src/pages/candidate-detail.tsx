import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { api, type Candidate, type CheckRunDetail, type CheckRunSummary, type ConnectorInfo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";

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
    queryFn: async () =>
      (await api.get<CheckRunDetail>(`/candidates/${candidateId}/runs/${lastRunId}`)).data,
    enabled: !!lastRunId,
    refetchInterval: (q) => (q.state.data?.status === "running" ? 2000 : false),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const runCheck = useMutation({
    mutationFn: async () => {
      await api.post(`/candidates/${candidateId}/check`, {
        connector_keys: selected.size ? [...selected] : null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      qc.invalidateQueries({ queryKey: ["runs", candidateId] });
    },
  });

  if (!cand) return <p className="text-[hsl(var(--muted-fg))]">Загрузка…</p>;

  const allSelected = selected.size === 0 || selected.size === connectors.length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {cand.last_name} {cand.first_name} {cand.middle_name ?? ""}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-fg))]">
          ИНН {cand.inn ?? "—"} • ДР {formatDate(cand.birth_date)} • сегмент {cand.role_segment}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-[hsl(var(--muted-fg))]">Согласие</p>
            <p>{cand.consent_signed_offline ? "Подписано на бумаге" : "Не отмечено"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-[hsl(var(--muted-fg))]">Телефон</p>
            <p>{cand.phone ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-[hsl(var(--muted-fg))]">Email</p>
            <p>{cand.email ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Запуск проверки</CardTitle>
          <div className="text-xs text-[hsl(var(--muted-fg))]">
            {selected.size === 0 ? "запустить все" : `выбрано ${selected.size} из ${connectors.length}`}
          </div>
        </CardHeader>
        <CardContent>
          {!cand.consent_signed_offline ? (
            <p className="text-sm text-[hsl(var(--warning))]">Согласие не отмечено — запуск заблокирован.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {connectors.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allSelected || selected.has(c.key)}
                      onChange={(e) => {
                        const s = new Set(selected.size === 0 ? connectors.map((x) => x.key) : selected);
                        if (e.target.checked) s.add(c.key);
                        else s.delete(c.key);
                        setSelected(s.size === connectors.length ? new Set() : s);
                      }}
                    />
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="font-mono text-[10px] text-[hsl(var(--muted-fg))]">{c.key}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => runCheck.mutate()} disabled={runCheck.isPending}>
                  <Play size={16} /> {runCheck.isPending ? "Запуск…" : "Запустить проверку"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {lastRun && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Запуск #{lastRun.id} — {lastRun.status}</CardTitle>
            {lastRun.risk_segment && (
              <Badge tone={lastRun.risk_segment}>
                {lastRun.risk_segment} • score {lastRun.risk_score}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[hsl(var(--muted-fg))]">
                <tr>
                  <th className="py-2">Источник</th>
                  <th className="py-2">Статус</th>
                  <th className="py-2">Резюме</th>
                  <th className="py-2 text-right">мс</th>
                </tr>
              </thead>
              <tbody>
                {lastRun.results.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 font-mono text-xs">{r.source}</td>
                    <td className="py-2">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="py-2">{r.summary}</td>
                    <td className="py-2 text-right text-xs text-[hsl(var(--muted-fg))]">{r.duration_ms ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>История запусков</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[hsl(var(--muted-fg))]">
              <tr><th className="py-2">#</th><th className="py-2">Сегмент</th><th className="py-2">Score</th><th className="py-2">Статус</th><th className="py-2">Создан</th></tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.id}</td>
                  <td className="py-2">{r.risk_segment ? <Badge tone={r.risk_segment}>{r.risk_segment}</Badge> : "—"}</td>
                  <td className="py-2">{r.risk_score ?? "—"}</td>
                  <td className="py-2">{r.status}</td>
                  <td className="py-2 text-[hsl(var(--muted-fg))]">{formatDateTime(r.created_at)}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-[hsl(var(--muted-fg))]">Запусков ещё нет</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function statusTone(s: string): "green" | "yellow" | "red" | "neutral" {
  if (s === "ok") return "green";
  if (s === "warning") return "yellow";
  if (s === "fail") return "red";
  return "neutral";
}
