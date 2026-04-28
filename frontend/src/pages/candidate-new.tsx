import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, FileCheck, Fingerprint, Sliders } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageBody, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PassportDropZone } from "@/components/passport-uploader";
import type { PassportOcrFields } from "@/lib/api";

const SEGMENTS = [
  { value: "default", label: "default — общая роль" },
  { value: "driver", label: "driver — водители" },
  { value: "financial", label: "financial — финсектор" },
];

export function CandidateNewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    last_name: "",
    first_name: "",
    middle_name: "",
    birth_date: "",
    inn: "",
    snils: "",
    passport: "",
    phone: "",
    email: "",
    role_segment: "default",
    consent_signed_offline: true,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyOcr(fields: PassportOcrFields) {
    setForm((f) => ({
      ...f,
      last_name: fields.last_name || f.last_name,
      first_name: fields.first_name || f.first_name,
      middle_name: fields.middle_name || f.middle_name,
      birth_date: fields.birth_date || f.birth_date,
      passport:
        fields.series && fields.number
          ? `${fields.series} ${fields.number}`
          : f.passport,
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/candidates", {
        last_name: form.last_name,
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        birth_date: form.birth_date ? `${form.birth_date}T00:00:00` : null,
        inn: form.inn || null,
        snils: form.snils || null,
        passport: form.passport || null,
        phone: form.phone || null,
        email: form.email || null,
        role_segment: form.role_segment,
        consent_signed_offline: form.consent_signed_offline,
      });
      toast.success("Кандидат добавлен");
      navigate(`/candidates/${data.id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="new dossier"
        title="Новый кандидат"
        description="Загрузи фото паспорта — поля заполнятся автоматически. Или впиши вручную."
        actions={
          <Link to="/candidates">
            <Button variant="ghost"><ChevronLeft size={16} /> К списку</Button>
          </Link>
        }
      />
      <PageBody>
        <div className="mb-6 max-w-3xl">
          <PassportDropZone onRecognized={applyOcr} />
        </div>
        <form onSubmit={onSubmit} className="grid max-w-3xl gap-5">
          <Card>
            <CardHeader>
              <Fingerprint size={16} className="mt-0.5 text-[hsl(var(--primary))]" />
              <div className="flex-1">
                <CardTitle>Личные данные</CardTitle>
                <CardDescription>ФИО и дата рождения</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Sliders size={16} className="mt-0.5 text-[hsl(var(--accent))]" />
              <div className="flex-1">
                <CardTitle>Идентификаторы</CardTitle>
                <CardDescription>Чем больше, тем точнее сужение по совпадениям</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="ИНН (10/12 цифр)">
                <Input value={form.inn} onChange={(e) => update("inn", e.target.value)} pattern="\d{10,12}" inputMode="numeric" />
              </Field>
              <Field label="Паспорт РФ (10 цифр)">
                <Input value={form.passport} onChange={(e) => update("passport", e.target.value)} placeholder="1234 567890" />
              </Field>
              <Field label="СНИЛС">
                <Input value={form.snils} onChange={(e) => update("snils", e.target.value)} />
              </Field>
              <Field label="Телефон">
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} type="tel" />
              </Field>
              <Field label="Email" full>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileCheck size={16} className="mt-0.5 text-[hsl(var(--success))]" />
              <div className="flex-1">
                <CardTitle>Сегмент и согласие</CardTitle>
                <CardDescription>
                  Сегмент определяет веса коннекторов в скоринге
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Сегмент роли">
                <Select value={form.role_segment} onChange={(e) => update("role_segment", e.target.value)}>
                  {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
              <label className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-3 transition-colors hover:bg-[hsl(var(--muted))]">
                <input
                  type="checkbox"
                  checked={form.consent_signed_offline}
                  onChange={(e) => update("consent_signed_offline", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <div>
                  <div className="text-sm font-medium">Согласие на обработку ПДн подписано</div>
                  <div className="mt-0.5 text-xs text-[hsl(var(--muted-fg))]">
                    Бумажная форма (152-ФЗ). Без отметки запуск проверки заблокирован.
                  </div>
                </div>
              </label>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Link to="/candidates"><Button type="button" variant="outline">Отмена</Button></Link>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Сохранение…" : "Создать кандидата →"}
            </Button>
          </div>
        </form>
      </PageBody>
    </>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
