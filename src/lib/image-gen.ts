import type { GeneratedCard, StoreBrief } from "./types";

const OPENAI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

export function isImageGenConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

interface ImageGenInput {
  brief: StoreBrief;
  cards: GeneratedCard[];
}

interface ImageGenResult {
  cards: GeneratedCard[];
  source: "gpt-image-2" | "mock";
  notes?: string;
}

function buildImagePrompt(brief: StoreBrief, card: GeneratedCard): string {
  return [
    `Korean small business Instagram card-news visual.`,
    `Store: ${brief.storeName} (${brief.category}).`,
    `Purpose: ${brief.purpose}. Tone: ${brief.tone}.`,
    `Hero copy: "${card.copy.headline}".`,
    brief.highlight ? `Key visual subject: ${brief.highlight}.` : "",
    `Composition: square 1:1, clean editorial, soft natural lighting,`,
    `appetizing if food, premium brand-feel, no text overlay (text is rendered separately).`,
  ].filter(Boolean).join(" ");
}

export async function generateCardImages({
  brief,
  cards,
}: ImageGenInput): Promise<ImageGenResult> {
  if (!isImageGenConfigured()) {
    return { cards, source: "mock", notes: "OPENAI_API_KEY 미설정 — mock 이미지로 동작" };
  }

  const updated: GeneratedCard[] = [];
  for (const card of cards) {
    try {
      const res = await fetch(`${OPENAI_BASE}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          prompt: buildImagePrompt(brief, card),
          size: "1024x1024",
          n: 1,
        }),
      });
      if (!res.ok) {
        updated.push({ ...card, imageSource: "mock" });
        continue;
      }
      const data = await res.json();
      const url = data?.data?.[0]?.url || data?.data?.[0]?.b64_json;
      if (!url) {
        updated.push({ ...card, imageSource: "mock" });
        continue;
      }
      updated.push({
        ...card,
        imageUrl: typeof url === "string" && url.startsWith("http") ? url : `data:image/png;base64,${url}`,
        imageSource: "gpt-image-2",
      });
    } catch {
      updated.push({ ...card, imageSource: "mock" });
    }
  }

  const anyReal = updated.some((c) => c.imageSource === "gpt-image-2");
  return {
    cards: updated,
    source: anyReal ? "gpt-image-2" : "mock",
    notes: anyReal ? undefined : "이미지 생성 실패 — mock 폴백",
  };
}
