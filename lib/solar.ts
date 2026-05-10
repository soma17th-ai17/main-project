import type { PromotionRequest, SolarCopy } from "./types";

const purposeLabels = {
  "new-menu": "신메뉴 출시",
  event: "이벤트",
  daily: "일상 홍보"
};

function fallbackCopy(request: PromotionRequest): SolarCopy {
  const storeName = request.store.storeName || "우리 가게";
  const category = request.store.category || "가게";
  const detail = request.detail || purposeLabels[request.purpose];
  const vibe = request.store.vibe || "따뜻한";
  const feedbackLine = request.feedback ? `\n요청하신 방향도 반영했어요: ${request.feedback}` : "";

  return {
    copyText: `${storeName}에서 준비한 ${detail} 소식입니다.\n${vibe} 분위기의 ${category} 감성을 담아 오늘 방문하고 싶은 이유를 전해드려요.${feedbackLine}\n가볍게 들러 특별한 순간을 만나보세요.`,
    hashtags: ["우리동네가게", "소상공인", category.replace(/\s+/g, ""), detail.replace(/\s+/g, "")].filter(Boolean),
    imagePrompt: `${category} 매장의 ${detail} 홍보용 SNS 이미지, ${vibe} 톤, 깔끔한 구성, 메뉴와 분위기가 잘 보이는 장면`,
    tone: vibe,
    source: "fallback"
  };
}

function parseSolarJson(content: string, request: PromotionRequest): SolarCopy {
  const parsed = JSON.parse(content) as Partial<SolarCopy>;
  if (!parsed.copyText || !Array.isArray(parsed.hashtags) || !parsed.imagePrompt) {
    return fallbackCopy(request);
  }

  return {
    copyText: String(parsed.copyText),
    hashtags: parsed.hashtags.map(String).slice(0, 6),
    imagePrompt: String(parsed.imagePrompt),
    tone: parsed.tone ? String(parsed.tone) : request.store.vibe,
    source: "solar"
  };
}

export function isSolarConfigured() {
  return Boolean(process.env.UPSTAGE_API_KEY);
}

export async function generateSolarCopy(request: PromotionRequest): Promise<SolarCopy> {
  if (!process.env.UPSTAGE_API_KEY) {
    return fallbackCopy(request);
  }

  const baseUrl = process.env.UPSTAGE_BASE_URL ?? "https://api.upstage.ai/v1";
  const model = process.env.UPSTAGE_MODEL ?? "solar-pro3";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.72,
        messages: [
          {
            role: "system",
            content:
              "You are a Korean small-business promotion copywriter. Return only strict JSON with copyText, hashtags, imagePrompt, and tone. Avoid exaggerated claims, medical claims, and adult content."
          },
          {
            role: "user",
            content: JSON.stringify({
              store: request.store,
              purpose: purposeLabels[request.purpose],
              detail: request.detail,
              platform: request.platform ?? "instagram",
              feedback: request.feedback ?? ""
            })
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return fallbackCopy(request);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return fallbackCopy(request);
    }

    return parseSolarJson(content, request);
  } catch {
    return fallbackCopy(request);
  } finally {
    clearTimeout(timeout);
  }
}
