import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { api, type PassportOcrFields, type PassportOcrResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
      const filled = Object.entries(data.fields).filter(
        ([k, v]) => v && k !== "raw_text",
      ).length;
      toast.success(`Распознано ${filled} полей за ${data.elapsed_ms} мс`);
      setOpen(false);
      setPreview(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? e?.message ?? "Ошибка распознавания");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-dashed"
      >
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
              transition={{ type: "spring", damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <ScanLine size={16} className="text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold">Распознавание паспорта</h3>
                  </div>
                  <button
                    onClick={() => !loading && setOpen(false)}
                    disabled={loading}
                    className="rounded-md p-1.5 text-[hsl(var(--muted-fg))] hover:bg-[hsl(var(--muted))]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5">
                  {!preview && !loading && (
                    <label
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[hsl(var(--border-strong))] bg-[hsl(var(--bg))] py-12 transition-colors hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--primary-soft))]/40"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleUpload(f);
                      }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))]">
                        <Camera size={24} />
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Перетащите фото или нажмите</div>
                        <div className="mono mt-1 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                          jpg · png · heic · до 20 MB
                        </div>
                      </div>
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
                  )}

                  {(preview || loading) && (
                    <div className="space-y-4">
                      {preview && (
                        <div className="relative overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                          <img src={preview} alt="passport" className="block w-full" />
                          {loading && (
                            <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
                              <div className="flex flex-col items-center gap-2 text-white">
                                <Loader2 size={28} className="animate-spin" />
                                <div className="mono text-xs uppercase tracking-widest">
                                  сканирование…
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent",
                                  "animate-scan",
                                )}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <p className="mono text-center text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))]">
                        EasyOCR · ru+en · GPU on Spark
                      </p>
                    </div>
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
