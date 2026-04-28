import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, Loader2, ScanLine, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { api, type PassportOcrFields, type PassportOcrResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
 * PassportDropZone — большая drop-zone в самом верху формы
 * "Сразу видно куда тащить".
 * ────────────────────────────────────────────────────────────── */
export function PassportDropZone({
  onRecognized,
}: {
  onRecognized: (f: PassportOcrFields) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [filledCount, setFilledCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setDone(false);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await api.post<PassportOcrResponse>("/passport-ocr", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onRecognized(data.fields);
      const filled = Object.entries(data.fields).filter(
        ([k, v]) => v && k !== "raw_text",
      ).length;
      setFilledCount(filled);
      setDone(true);
      toast.success(`Распознано ${filled} полей за ${data.elapsed_ms} мс — проверьте ниже`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? e?.message ?? "Ошибка распознавания");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPreview(null);
    setDone(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  if (preview && (loading || done)) {
    return (
      <Card className="overflow-hidden">
        <div className="grid items-stretch gap-0 sm:grid-cols-[200px_1fr]">
          <div className="relative">
            <img src={preview} alt="passport" className="h-full w-full object-cover" />
            {loading && (
              <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="mono text-[10px] uppercase tracking-widest">scan</span>
                </div>
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent animate-scan" />
              </div>
            )}
            {done && (
              <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--success))] text-white shadow-lg">
                <CheckCircle2 size={16} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 p-5">
            <div>
              <div className="mono mb-1 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-fg))]">
                {loading ? "passport-ocr · spark · gpu" : "готово"}
              </div>
              <div className="text-base font-semibold">
                {loading
                  ? "Распознаём паспорт…"
                  : `Заполнено ${filledCount} полей формы ниже ↓`}
              </div>
              {done && (
                <p className="mt-1 text-xs text-[hsl(var(--muted-fg))]">
                  Проверьте поля и при необходимости поправьте вручную
                </p>
              )}
            </div>
            {done && (
              <Button variant="outline" size="sm" onClick={reset}>
                <X size={14} /> Сбросить
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      className={cn(
        "group relative flex cursor-pointer items-center justify-between gap-5 overflow-hidden rounded-xl border-2 border-dashed px-6 py-5 transition-all",
        dragOver
          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary-soft))]/40 shadow-[0_0_28px_-4px_hsl(var(--primary)/0.5)]"
          : "border-[hsl(var(--border-strong))] bg-[hsl(var(--surface))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--primary-soft))]/30",
      )}
    >
      {/* shimmer на hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-soft rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] blur-xl opacity-50" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-lg">
            <Camera size={22} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">
              Перетащите фото паспорта
            </h3>
            <span className="mono inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent-soft))] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[hsl(var(--accent))]">
              <Sparkles size={10} /> AI
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-fg))]">
            или нажмите чтобы выбрать файл — поля заполнятся автоматически
          </p>
          <p className="mono mt-1 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
            jpg · png · heic · до 20 mb · easyocr на gpu
          </p>
        </div>
      </div>

      <Button variant="primary" type="button" tabIndex={-1} className="pointer-events-none">
        Выбрать файл
      </Button>

      <input
        ref={fileInput}
        type="file"
        accept="image/*,.heic"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────
 * PassportUploader — модалка (если где-то ещё нужна)
 * ────────────────────────────────────────────────────────────── */
export function PassportUploader({
  onRecognized,
}: {
  onRecognized: (f: PassportOcrFields) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await api.post<PassportOcrResponse>("/passport-ocr", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onRecognized(data.fields);
      toast.success("Распознано");
      setOpen(false);
      setPreview(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Camera size={16} /> Распознать паспорт
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Card className="overflow-hidden p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanLine size={16} className="text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold">Распознавание паспорта</h3>
                  </div>
                  <button onClick={() => !loading && setOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-4">
                  {!preview ? (
                    <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed py-12 hover:bg-[hsl(var(--muted))]">
                      <Camera size={28} />
                      <span>Выберите фото</span>
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/*,.heic"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(f);
                        }}
                      />
                    </label>
                  ) : (
                    <img src={preview} alt="" className="rounded-lg" />
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
