"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardPreview } from "./card-preview";
import { TEMPLATES } from "@/lib/templates";
import type { GeneratedCard, UploadedPhoto } from "@/lib/types";

interface CardsGalleryProps {
  cards: GeneratedCard[];
  photos: UploadedPhoto[];
  storeName: string;
  source: "solar" | "fallback" | null;
  notes?: string;
  onRegenerate: () => void;
  busy: boolean;
}

export function CardsGallery({
  cards,
  photos,
  storeName,
  source,
  notes,
  onRegenerate,
  busy,
}: CardsGalleryProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const photoMap = new Map(photos.map((p) => [p.id, p]));

  const handleDownload = useCallback(
    async (card: GeneratedCard) => {
      const node = refs.current[card.id];
      if (!node) {
        toast.error("카드 노드를 찾지 못했어요.");
        return;
      }
      setDownloading(card.id);
      try {
        const dataUrl = await toPng(node, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#ffffff",
        });
        const link = document.createElement("a");
        link.href = dataUrl;
        const safeStore = (storeName || "card").replace(/[^\p{L}\p{N}_-]+/gu, "-");
        link.download = `${safeStore}-${card.id}.png`;
        link.click();
        toast.success(`${card.id} 다운로드 완료`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "다운로드 실패");
      } finally {
        setDownloading(null);
      }
    },
    [storeName],
  );

  const handleDownloadAll = useCallback(async () => {
    for (const card of cards) {
      await handleDownload(card);
      await new Promise((r) => setTimeout(r, 200));
    }
  }, [cards, handleDownload]);

  if (!cards.length) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            카드뉴스 {cards.length}장
          </Badge>
          <Badge
            variant={source === "solar" ? "default" : "outline"}
            className="rounded-full"
          >
            {source === "solar" ? "Solar 카피" : "fallback 카피"}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            mock 이미지
          </Badge>
          {notes && (
            <span className="text-xs text-muted-foreground">{notes}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-1.5 size-4" />
            )}
            다시 굴리기
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDownloadAll}
            disabled={Boolean(downloading)}
          >
            <Download className="mr-1.5 size-4" />
            전부 PNG 다운로드
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {cards.map((card, i) => {
            const photo = card.photoId ? photoMap.get(card.photoId) : undefined;
            const tpl = TEMPLATES.find((t) => t.id === card.template);
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="overflow-hidden rounded-3xl border border-border/70 bg-card"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3 text-xs">
                  <div className="flex flex-col">
                    <span className="font-mono font-semibold uppercase tracking-widest text-brand-coral">
                      {card.id}
                    </span>
                    <span className="font-medium text-foreground">
                      {tpl?.label ?? card.template}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(card)}
                    disabled={downloading === card.id}
                  >
                    {downloading === card.id ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 size-4" />
                    )}
                    PNG
                  </Button>
                </div>
                <div className="grid place-items-center bg-muted/30 p-4">
                  <CardPreview
                    ref={(el) => {
                      refs.current[card.id] = el;
                    }}
                    card={card}
                    photo={photo}
                    storeName={storeName}
                    size={460}
                  />
                </div>
                <div className="space-y-2 px-5 py-4 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    {card.copy.hashtags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
