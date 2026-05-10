"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, ImagePlus, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StepProgress, type StepDef } from "./step-progress";
import { StoreForm } from "./store-form";
import { ProcessingStep } from "./processing-step";
import { ResultStep } from "./result-step";
import type { GenerationResult, StoreBrief } from "@/lib/types";

const STEPS: StepDef[] = [
  { key: "info", label: "가게 정보", short: "정보" },
  { key: "processing", label: "AI 작업", short: "작업" },
  { key: "result", label: "결과 확인", short: "결과" },
];

const DEFAULT_BRIEF: StoreBrief = {
  storeName: "",
  category: "",
  purpose: "new-menu",
  tone: "warm",
  highlight: "",
  detail: "",
  ctaText: "",
  priceText: "",
};

const PROCESSING_MIN_MS = 2400;

export function WizardShell() {
  const [stepIdx, setStepIdx] = useState(0);
  const [brief, setBrief] = useState<StoreBrief>(DEFAULT_BRIEF);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [processingStartedAt, setProcessingStartedAt] = useState(0);
  const [processingDone, setProcessingDone] = useState(false);

  const canNext = useMemo(() => {
    if (stepIdx === 0) {
      return brief.storeName.trim().length > 0 && brief.category.trim().length > 0;
    }
    return true;
  }, [stepIdx, brief]);

  const runGenerate = useCallback(async () => {
    setBusy(true);
    setProcessingDone(false);
    setProcessingStartedAt(Date.now());
    setStepIdx(1);

    const startedAt = Date.now();
    try {
      const res = await fetch("/api/cards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          count: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        const message = data?.error || `생성 실패 (HTTP ${res.status})`;
        toast.error(message);
        setBusy(false);
        setStepIdx(0);
        return;
      }
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, PROCESSING_MIN_MS - elapsed);
      setTimeout(() => {
        setProcessingDone(true);
        setResult(data.result as GenerationResult);
        setBusy(false);
        setStepIdx(2);
      }, wait);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "네트워크 오류");
      setBusy(false);
      setStepIdx(0);
    }
  }, [brief]);

  const handleNext = () => {
    if (!canNext) return;
    if (stepIdx === 0) {
      runGenerate();
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const handleEdit = () => setStepIdx(0);
  const handleRestart = () => {
    setBrief(DEFAULT_BRIEF);
    setResult(null);
    setStepIdx(0);
  };

  return (
    <div className="flex flex-col">
      <StepProgress steps={STEPS} current={stepIdx} />

      <div className="relative">
        <AnimatePresence mode="wait">
          {stepIdx === 0 && (
            <StepFrame key="info">
              <StepHeader
                icon={ClipboardList}
                eyebrow="STEP 1"
                title="가게 정보를 알려주세요"
                subtitle="가게 이름과 업종은 필수예요. 입력값을 바탕으로 카드 이미지와 문구를 함께 만들어 드려요."
              />
              <StoreForm value={brief} onChange={setBrief} />
              <Footer
                onPrev={undefined}
                onNext={handleNext}
                disabledNext={!canNext}
                nextLabel="다음 — 홍보물 만들기"
                hint={!canNext ? "가게 이름과 업종을 입력해 주세요" : undefined}
              />
            </StepFrame>
          )}

          {stepIdx === 1 && (
            <StepFrame key="processing" wide>
              <ProcessingStep
                startedAt={processingStartedAt}
                done={processingDone}
              />
            </StepFrame>
          )}

          {stepIdx === 2 && result && (
            <StepFrame key="result" wide>
              <ResultStep
                result={result}
                busy={busy}
                onRegenerate={runGenerate}
                onEdit={handleEdit}
                onRestart={handleRestart}
              />
            </StepFrame>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface StepFrameProps {
  children: React.ReactNode;
  wide?: boolean;
}

function StepFrame({ children, wide = false }: StepFrameProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={
        "mx-auto flex w-full flex-col gap-8 px-5 py-8 sm:py-12 " +
        (wide ? "max-w-5xl" : "max-w-2xl")
      }
    >
      {children}
    </motion.section>
  );
}

function StepHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: typeof ImagePlus;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-col items-start gap-3">
      <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue-strong">
        <Icon className="size-3.5" /> {eyebrow}
      </span>
      <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="text-base text-muted-foreground sm:text-lg">{subtitle}</p>
    </header>
  );
}

interface FooterProps {
  onPrev?: () => void;
  onNext?: () => void;
  disabledNext?: boolean;
  nextLabel: string;
  hint?: string;
}

function Footer({ onPrev, onNext, disabledNext, nextLabel, hint }: FooterProps) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-2 border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
        {hint && (
          <p className="text-center text-xs font-medium text-muted-foreground sm:text-left">
            {hint}
          </p>
        )}
        <div className="flex items-center gap-3">
          {onPrev ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onPrev}
              className="h-14 rounded-2xl px-5 text-base"
            >
              <ArrowLeft className="mr-1 size-4" /> 이전
            </Button>
          ) : (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="lg"
              className="h-14 rounded-2xl px-5 text-base"
            >
              <Link href="/">
                <ArrowLeft className="mr-1 size-4" /> 홈으로
              </Link>
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            onClick={onNext}
            disabled={disabledNext}
            className="ml-auto h-14 flex-1 rounded-2xl text-base font-bold sm:flex-none sm:px-7 sm:text-lg"
          >
            {nextLabel}
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
