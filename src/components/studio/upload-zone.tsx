"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "motion/react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { UploadedPhoto } from "@/lib/types";

const MAX_BYTES = 6 * 1024 * 1024;
const MAX_PHOTOS = 4;

interface UploadZoneProps {
  photos: UploadedPhoto[];
  onChange: (next: UploadedPhoto[]) => void;
}

function readAsDataUrl(file: File): Promise<UploadedPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽지 못했어요."));
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        resolve({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          dataUrl,
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function UploadZone({ photos, onChange }: UploadZoneProps) {
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      const room = MAX_PHOTOS - photos.length;
      if (room <= 0) {
        toast.warning(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`);
        return;
      }
      const oversized = accepted.find((f) => f.size > MAX_BYTES);
      if (oversized) {
        toast.error("6MB 이하 이미지만 업로드 가능합니다.");
        return;
      }
      const slice = accepted.slice(0, room);
      setBusy(true);
      try {
        const next = await Promise.all(slice.map(readAsDataUrl));
        onChange([...photos, ...next]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "업로드 실패");
      } finally {
        setBusy(false);
      }
    },
    [photos, onChange],
  );

  const dz = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: true,
    maxFiles: MAX_PHOTOS,
    disabled: busy || photos.length >= MAX_PHOTOS,
  });

  useEffect(() => {
    return () => {
      // dataURLs are garbage collected with state
    };
  }, []);

  const remove = (id: string) => onChange(photos.filter((p) => p.id !== id));

  return (
    <div className="space-y-4">
      <div
        {...dz.getRootProps()}
        className={[
          "group relative grid cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed text-center transition",
          dz.isDragActive
            ? "border-brand-coral bg-brand-coral/5"
            : "border-border hover:border-brand-coral/60 hover:bg-muted/40",
          photos.length >= MAX_PHOTOS ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
        style={{ aspectRatio: "16/8" }}
      >
        <input {...dz.getInputProps()} />
        <div className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-coral/10 text-brand-coral">
            <ImagePlus className="size-5" />
          </span>
          <p className="font-medium text-foreground">
            {dz.isDragActive
              ? "여기에 놓으면 업로드돼요"
              : "사진을 끌어다 놓거나 클릭해 선택하세요"}
          </p>
          <p className="text-xs">
            JPG · PNG · WEBP, 6MB 이하 · 최대 {MAX_PHOTOS}장 ({photos.length}/
            {MAX_PHOTOS})
          </p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {photos.map((p) => (
              <motion.figure
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative overflow-hidden rounded-2xl border border-border/60"
              >
                <div className="aspect-square w-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.dataUrl}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 size-8 rounded-full bg-background/90 opacity-0 shadow-sm transition group-hover:opacity-100"
                  onClick={() => remove(p.id)}
                  aria-label={`${p.name} 삭제`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </motion.figure>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
