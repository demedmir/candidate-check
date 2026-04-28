import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, type Candidate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export function CandidatesListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: async () => (await api.get<Candidate[]>("/candidates")).data,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Кандидаты</h1>
        <Link to="/candidates/new">
          <Button>
            <Plus size={16} /> Новый
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--muted))]/50">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">ФИО</th>
              <th className="px-4 py-2 font-medium">ИНН</th>
              <th className="px-4 py-2 font-medium">Сегмент</th>
              <th className="px-4 py-2 font-medium">Risk</th>
              <th className="px-4 py-2 font-medium">Согласие</th>
              <th className="px-4 py-2 font-medium">Создан</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-4 text-[hsl(var(--muted-fg))]">Загрузка…</td></tr>
            )}
            {data?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-4 text-[hsl(var(--muted-fg))]">Нет кандидатов</td></tr>
            )}
            {data?.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2">
                  <Link to={`/candidates/${c.id}`} className="font-medium hover:underline">
                    {c.last_name} {c.first_name} {c.middle_name ?? ""}
                  </Link>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{c.inn ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.role_segment}</td>
                <td className="px-4 py-2">
                  {c.last_run?.risk_segment
                    ? <Badge tone={c.last_run.risk_segment}>{c.last_run.risk_segment} ({c.last_run.risk_score})</Badge>
                    : <span className="text-[hsl(var(--muted-fg))]">—</span>}
                </td>
                <td className="px-4 py-2">{c.consent_signed_offline ? "✓" : "—"}</td>
                <td className="px-4 py-2 text-[hsl(var(--muted-fg))]">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
