import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, type DocType, type DocumentRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

export function DocumentsSection({ candidateId }: { candidateId: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("pnd");
  const [comment, setComment] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: types = [] } = useQuery({
    queryKey: ["doc-types"],
    queryFn: async () => (await api.get<DocType[]>("/document-types")).data,
    staleTime: Infinity,
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents", candidateId],
    queryFn: async () =>
      (await api.get<DocumentRecord[]>(`/candidates/${candidateId}/documents`)).data,
  });

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileInput.current?.files?.[0];
      if (!file) throw new Error("Файл не выбран");
      const fd = new FormData();
      fd.append("doc_type", docType);
      if (comment) fd.append("comment", comment);
      fd.append("file", file);
      await api.post(`/candidates/${candidateId}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Документ загружен");
      setOpen(false);
      setComment("");
      if (fileInput.current) fileInput.current.value = "";
      qc.invalidateQueries({ queryKey: ["documents", candidateId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? e?.message ?? "Ошибка"),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/candidates/${candidateId}/documents/${id}`);
    },
    onSuccess: () => {
      toast.success("Удалено");
      qc.invalidateQueries({ queryKey: ["documents", candidateId] });
    },
  });

  const typeLabel = (k: string) => types.find((t) => t.key === k)?.label ?? k;

  return (
    <Card>
      <CardHeader>
        <FileText size={16} className="mt-0.5 text-[hsl(var(--accent))]" />
        <div className="flex-1">
          <CardTitle>Документы от кандидата</CardTitle>
          <p className="mono mt-0.5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
            ПНД · нарк. · военник · справка о судимости · диплом · паспорт
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus size={14} /> Загрузить
        </Button>
      </CardHeader>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden border-b border-[hsl(var(--border))]"
        >
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Тип документа</Label>
              <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                {types.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Комментарий</Label>
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="напр. дата выдачи / номер" />
            </div>
            <div className="space-y-1.5">
              <Label>Файл</Label>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic"
                className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[hsl(var(--muted))] file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-[hsl(var(--surface-hover))]"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Отмена</Button>
              <Button variant="primary" size="sm" onClick={() => upload.mutate()} disabled={upload.isPending}>
                {upload.isPending ? "Загрузка…" : <><Upload size={14} /> Загрузить</>}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : docs.length === 0 ? (
          <Empty
            icon={FileText}
            title="Документов нет"
            description="Загрузите справки и сканы, которые кандидат предоставил"
            className="border-none py-10"
          />
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {docs.map((d) => (
              <div key={d.id} className="flex items-start gap-3 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent))]">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{typeLabel(d.doc_type)}</Badge>
                    <span className="mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                      {formatDateTime(d.uploaded_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm">{d.file_name ?? d.file_path}</p>
                  {d.comment && (
                    <p className="text-xs text-[hsl(var(--muted-fg))]">{d.comment}</p>
                  )}
                </div>
                <button
                  onClick={() => del.mutate(d.id)}
                  className="rounded-md p-1.5 text-[hsl(var(--muted-fg))] hover:bg-[hsl(var(--danger-soft))] hover:text-[hsl(var(--danger))]"
                  aria-label="delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
