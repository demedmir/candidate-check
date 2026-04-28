import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const SEGMENTS = [
  { value: "default", label: "default — общая" },
  { value: "driver", label: "driver — водители" },
  { value: "financial", label: "financial — финсектор" },
];

export function CandidateNewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    last_name: "",
    first_name: "",
    middle_name: "",
    birth_date: "",
    inn: "",
    snils: "",
    phone: "",
    email: "",
    role_segment: "default",
    consent_signed_offline: true,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        last_name: form.last_name,
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        birth_date: form.birth_date ? `${form.birth_date}T00:00:00` : null,
        inn: form.inn || null,
        snils: form.snils || null,
        phone: form.phone || null,
        email: form.email || null,
        role_segment: form.role_segment,
        consent_signed_offline: form.consent_signed_offline,
      };
      const { data } = await api.post("/candidates", payload);
      navigate(`/candidates/${data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Ошибка создания");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-semibold">Новый кандидат</h1>
      <Card>
        <CardHeader>
          <CardTitle>Личные данные и идентификаторы</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
            <Field label="Фамилия *">
              <Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required />
            </Field>
            <Field label="Имя *">
              <Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required />
            </Field>
            <Field label="Отчество">
              <Input value={form.middle_name} onChange={(e) => update("middle_name", e.target.value)} />
            </Field>
            <Field label="Дата рождения">
              <Input type="date" value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} />
            </Field>
            <Field label="ИНН">
              <Input value={form.inn} onChange={(e) => update("inn", e.target.value)} pattern="\d{10,12}" />
            </Field>
            <Field label="СНИЛС">
              <Input value={form.snils} onChange={(e) => update("snils", e.target.value)} />
            </Field>
            <Field label="Телефон">
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Сегмент роли" full>
              <select
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                value={form.role_segment}
                onChange={(e) => update("role_segment", e.target.value)}
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.consent_signed_offline}
                onChange={(e) => update("consent_signed_offline", e.target.checked)}
              />
              Согласие подписано на бумаге (152-ФЗ)
            </label>
            {error && <p className="col-span-2 text-xs text-[hsl(var(--danger))]">{error}</p>}
            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? "Сохранение…" : "Создать"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
