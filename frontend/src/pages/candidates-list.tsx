import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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

  return (
    <>
      <PageHeader
        title="Кандидаты"
        description="Запуск проверок и история результатов"
        actions={
          <Link to="/candidates/new">
            <Button variant="primary">
              <Plus size={16} /> Новый
            </Button>
          </Link>
        }
      />
      <PageBody>
        <div className="mb-4 flex items-center gap-2">
          <div className="relative max-w-md flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-fg))]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по ФИО, ИНН, телефону…"
              className="pl-9"
            />
          </div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">
            {data ? `${filtered.length} из ${data.length}` : ""}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
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
          <div className="overflow-hidden rounded-xl border bg-[hsl(var(--surface))] shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead className="border-b bg-[hsl(var(--bg-alt))]">
                <tr className="text-left text-[11px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                  <th className="px-4 py-3 font-medium">Кандидат</th>
                  <th className="px-4 py-3 font-medium">ИНН</th>
                  <th className="px-4 py-3 font-medium">Сегмент</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Согласие</th>
                  <th className="px-4 py-3 font-medium">Создан</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const fullName = `${c.last_name} ${c.first_name}${c.middle_name ? " " + c.middle_name : ""}`;
                  return (
                    <tr
                      key={c.id}
                      className="border-b transition-colors last:border-0 hover:bg-[hsl(var(--bg-alt))]"
                    >
                      <td className="px-4 py-3">
                        <Link to={`/candidates/${c.id}`} className="flex items-center gap-3">
                          <Avatar name={fullName} size={32} />
                          <div className="min-w-0">
                            <div className="font-medium">{fullName}</div>
                            {c.email && (
                              <div className="text-xs text-[hsl(var(--muted-fg))]">{c.email}</div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--muted-fg))]">
                        {c.inn ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="outline">{c.role_segment}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {c.last_run?.risk_segment ? (
                          <Badge tone={c.last_run.risk_segment}>
                            {c.last_run.risk_segment} · {c.last_run.risk_score}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-fg))]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.consent_signed_offline ? (
                          <Badge tone="green">подписано</Badge>
                        ) : (
                          <Badge tone="outline">нет</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--muted-fg))]">
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>
    </>
  );
}
