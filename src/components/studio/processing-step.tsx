"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, ScanText, Sparkles, Hash, Wand2, Check } from "lucide-react";

const STEPS = [
  { icon: Camera, label: "사진 분석 중..." },
  { icon: ScanText, label: "업종과 분위기 파악 중..." },
  { icon: Wand2, label: "홍보 문구 작성 중..." },
  { icon: Sparkles, label: "카드뉴스 디자인 중..." },
  { icon: Hash, label: "해시태그 정리 중..." },
];

interface ProcessingStepProps {
  startedAt: number;
  done: boolean;
}

export function ProcessingStep({ startedAt, done }: ProcessingStepProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (done) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const target = Math.min(STEPS.length - 0.2, elapsed * 1.1);
      setProgress(target);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [startedAt, done]);

  const displayedProgress = done ? STEPS.length : progress;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-10 px-5 py-12 text-center">
      <div className="relative grid size-32 place-items-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-4 border-brand-blue/20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-3 rounded-full border-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{
            borderTopColor: "var(--brand-blue)",
            borderRightColor: "transparent",
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
          }}
        />
        <Sparkles className="size-10 text-brand-blue" strokeWidth={2.2} />
      </div>

      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          홍보물을 만드는 중이에요
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          평균 5초 안에 완성돼요. 잠시만 기다려 주세요.
        </p>
      </div>

      <ol className="w-full space-y-2 text-left">
        {STEPS.map((s, i) => {
          const isDone = i < Math.floor(displayedProgress);
          const isActive = i === Math.floor(displayedProgress) && !done;
          const opacity = isDone || isActive ? 1 : 0.5;
          return (
            <motion.li
              key={s.label}
              animate={{ opacity }}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 toss-shadow"
            >
              <span
                className={
                  "grid size-8 shrink-0 place-items-center rounded-full " +
                  (isDone
                    ? "bg-brand-blue text-white"
                    : isActive
                      ? "bg-brand-blue/15 text-brand-blue"
                      : "bg-muted text-muted-foreground")
                }
              >
                {isDone ? (
                  <Check className="size-4" />
                ) : (
                  <s.icon className="size-4" />
                )}
              </span>
              <span className="text-sm font-medium text-foreground">
                {s.label}
              </span>
              {isActive && (
                <motion.span
                  aria-hidden
                  className="ml-auto inline-flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="size-1.5 rounded-full bg-brand-blue"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        delay: d * 0.15,
                      }}
                    />
                  ))}
                </motion.span>
              )}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
