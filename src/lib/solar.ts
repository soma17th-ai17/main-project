import type { CardCopy, GeneratedCard, StoreBrief } from "./types";

const DEFAULT_MODEL = process.env.UPSTAGE_MODEL || "solar-pro3";
const DEFAULT_BASE = process.env.UPSTAGE_BASE_URL || "https://api.upstage.ai/v1";

interface SolarRefinement {
  cards: GeneratedCard[];
  source: "solar" | "fallback";
  notes?: string;
}

export function isSolarConfigured(): boolean {
  return Boolean(process.env.UPSTAGE_API_KEY);
}

interface SolarCard {
  headline?: string;
  subheadline?: string;
  bodyLines?: string[];
  hashtags?: string[];
  cta?: string;
  pricePill?: string;
  badge?: string;
}

function mergeCopy(base: CardCopy, patch: SolarCard | undefined): CardCopy {
  if (!patch) return base;
  const trim = (value: string | undefined, fallback: string) =>
    typeof value === "string" && value.trim().length ? value.trim() : fallback;
  const trimmedHashtags =
    patch.hashtags && patch.hashtags.length
      ? patch.hashtags
          .map((t) => t.replace(/^#/, "").trim())
          .filter(Boolean)
          .slice(0, 5)
      : base.hashtags;
  return {
    headline: trim(patch.headline, base.headline),
    subheadline: trim(patch.subheadline, base.subheadline),
    bodyLines:
      patch.bodyLines && patch.bodyLines.length
        ? patch.bodyLines.slice(0, 3).map((line) => line.trim()).filter(Boolean)
        : base.bodyLines,
    hashtags: trimmedHashtags,
    badge: trim(patch.badge, base.badge ?? ""),
    cta: trim(patch.cta, base.cta ?? ""),
    pricePill: trim(patch.pricePill, base.pricePill ?? ""),
  };
}

function buildPrompt(brief: StoreBrief, baseCards: GeneratedCard[]): string {
  const skeleton = baseCards.map((card, idx) => ({
    index: idx + 1,
    template: card.template,
    headlineHint: card.copy.headline,
    subheadlineHint: card.copy.subheadline,
  }));

  return [
    "너는 한국 소상공인을 위한 인스타 카드뉴스 카피라이터야.",
    "아래 가게 정보로 카드뉴스 4장을 작성해줘.",
    "각 카드는 headline, subheadline, bodyLines(2줄 이내), hashtags(3-5개), cta, pricePill, badge 필드를 가진 JSON object 야.",
    "headline은 12자 이내, subheadline은 18자 이내, bodyLines는 각 22자 이내. 과장 광고/허위 표현 금지.",
    "톤은 밝고 신뢰감 있게. 이모지는 카드당 0-1개만.",
    "응답은 반드시 JSON: { \"cards\": [...4개...] } 형태.",
    "",
    `가게명: ${brief.storeName}`,
    `업종: ${brief.category}`,
    `홍보 목적: ${brief.purpose}`,
    `톤: ${brief.tone}`,
    `핵심 키워드: ${brief.highlight}`,
    `상세 설명: ${brief.detail || "(없음)"}`,
    `가격 / 기간: ${brief.priceText || "(없음)"}`,
    `CTA 제안: ${brief.ctaText || "(없음)"}`,
    "",
    "참고용 카드 골격:",
    JSON.stringify(skeleton, null, 2),
  ].join("\n");
}

export async function refineCardsWithSolar(
  brief: StoreBrief,
  baseCards: GeneratedCard[],
): Promise<SolarRefinement> {
  if (!isSolarConfigured()) {
    return { cards: baseCards, source: "fallback", notes: "UPSTAGE_API_KEY 미설정" };
  }
  const prompt = buildPrompt(brief, baseCards);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    const res = await fetch(`${DEFAULT_BASE}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "한국어 카드뉴스 카피라이팅 어시스턴트. 무조건 한국어, 자연스러운 존댓말. JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return {
        cards: baseCards,
        source: "fallback",
        notes: `Solar HTTP ${res.status}`,
      };
    }
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { cards: baseCards, source: "fallback", notes: "Solar 응답 비어있음" };
    }
    let parsed: { cards?: SolarCard[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return { cards: baseCards, source: "fallback", notes: "Solar JSON parse 실패" };
    }
    const refined = baseCards.map((card, i) => ({
      ...card,
      copy: mergeCopy(card.copy, parsed.cards?.[i]),
    }));
    return { cards: refined, source: "solar" };
  } catch (err) {
    return {
      cards: baseCards,
      source: "fallback",
      notes: err instanceof Error ? err.message : "Solar 호출 예외",
    };
  }
}
