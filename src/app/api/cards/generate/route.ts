import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMockCards } from "@/lib/mock-generator";
import { refineCardsWithSolar } from "@/lib/solar";
import type { GenerationResult } from "@/lib/types";

const PURPOSE = ["new-menu", "event", "daily", "reopening", "review"] as const;
const TONE = ["warm", "trendy", "premium", "playful", "calm"] as const;

const briefSchema = z.object({
  storeName: z.string().min(1, "가게명을 입력해주세요").max(40),
  category: z.string().min(1, "업종을 입력해주세요").max(40),
  purpose: z.enum(PURPOSE),
  tone: z.enum(TONE),
  highlight: z.string().max(60).default(""),
  detail: z.string().max(200).default(""),
  ctaText: z.string().max(40).optional(),
  priceText: z.string().max(40).optional(),
});

const payloadSchema = z.object({
  brief: briefSchema,
  photoIds: z.array(z.string()).max(8).default([]),
  count: z.number().int().min(1).max(6).default(4),
  seed: z.string().optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "요청 본문이 JSON 이 아닙니다." },
      { status: 400 },
    );
  }

  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "입력값을 확인해주세요.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const { brief, photoIds, count, seed } = parsed.data;
  const baseCards = generateMockCards({ brief, photoIds, count, seed });
  const { cards, source, notes } = await refineCardsWithSolar(brief, baseCards);

  const result: GenerationResult = {
    id: `gen-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    brief,
    cards,
    source,
    notes,
  };

  return NextResponse.json({ ok: true, result });
}
