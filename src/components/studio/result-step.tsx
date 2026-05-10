"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Copy, Check, Sparkles, RotateCcw, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CardsGallery } from "./cards-gallery";
import type { GenerationResult } from "@/lib/types";

interface ResultStepProps {
  result: GenerationResult;
  busy: boolean;
  onRegenerate: () => void;
  onEdit: () => void;
  onRestart: () => void;
}

function buildCaption(result: GenerationResult): string {
  const card = result.cards[0];
  const lines = [
    card.copy.headline,
    "",
    card.copy.bodyLines.join(" "),
  ];
  if (card.copy.cta) {
    lines.push("", card.copy.cta);
  }
  if (card.copy.hashtags.length) {
    lines.push("", card.copy.hashtags.map((t) => `#${t}`).join(" "));
  }
  return lines.filter((l) => l !== undefined).join("\n");
}

export function ResultStep({
  result,
  busy,
  onRegenerate,
  onEdit,
  onRestart,
}: ResultStepProps) {
  const caption = useMemo(() => buildCaption(result), [result]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      toast.success("홍보 문구를 복사했어요.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("복사에 실패했어요. 직접 선택해 주세요.");
    }
  };

  const allHashtags = useMemo(() => {
    const set = new Set<string>();
    result.cards.forEach((c) => c.copy.hashtags.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 12);
  }, [result.cards]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-3xl space-y-10 px-5 py-8"
    >
      <header className="flex flex-col gap-3 text-center sm:text-left">
        <div className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-brand-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue-strong sm:self-start">
          <Sparkles className="size-3.5" />
          완성됐어요
        </div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {result.brief.storeName}님의 홍보물입니다.
        </h2>
        <p className="text-base text-muted-foreground">
          마음에 드는 카드를 골라 PNG 로 저장하고, 아래 홍보 문구를 그대로
          인스타에 붙여 넣으세요.
        </p>
      </header>

      <section className="rounded-3xl border border-border/70 bg-card p-6 toss-shadow sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold tracking-tight">
            홍보 문구 (SNS 캡션)
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="rounded-full"
          >
            {copied ? (
              <>
                <Check className="mr-1.5 size-4" /> 복사됨
              </>
            ) : (
              <>
                <Copy className="mr-1.5 size-4" /> 문구 복사
              </>
            )}
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-keep rounded-2xl bg-muted/60 p-5 text-sm leading-relaxed text-foreground sm:text-base">
{caption}
        </pre>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold tracking-tight">
            카드뉴스 4컷
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              {result.source === "solar" ? "Solar 카피" : "fallback 카피"}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {result.imageSource === "gpt-image-2" ? "GPT 이미지" : "mock 이미지"}
            </Badge>
          </div>
        </div>
        <CardsGallery
          cards={result.cards}
          storeName={result.brief.storeName}
          source={result.source}
          imageSource={result.imageSource}
          notes={result.notes}
          onRegenerate={onRegenerate}
          busy={busy}
        />
      </section>

      <section className="rounded-3xl border border-border/70 bg-card p-6 toss-shadow sm:p-8">
        <h3 className="font-display text-lg font-bold tracking-tight">
          추천 해시태그
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          업종과 홍보 목적에 맞춰 자동 생성했어요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {allHashtags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-brand-blue-soft px-3 py-1.5 text-sm font-medium text-brand-blue-strong"
            >
              #{t}
            </span>
          ))}
        </div>
      </section>

      <Separator />

      <div className="flex flex-col gap-5 pb-16">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onEdit}
            className="h-14 w-full rounded-2xl text-base"
          >
            <PencilLine className="mr-1.5 size-4" />
            가게 정보 수정
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onRestart}
            className="h-14 w-full rounded-2xl text-base font-bold"
          >
            <RotateCcw className="mr-1.5 size-4" />
            처음부터 다시 만들기
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          이미지는 OPENAI_API_KEY 미설정 시 mock 으로 동작해요 · 텍스트는 Upstage Solar 로 생성합니다 (키 미설정 시 fallback 문구)
        </p>
      </div>
    </motion.div>
  );
}
