import { pipelineLog, nowMs, elapsedMs } from "./pipeline-log";
import type { PromotionRequest, Verification } from "./types";

type ExtractedFields = {
  storeName?: string | null;
  dish?: string | null;
  benefit?: string | null;
  koreanText?: string[];
};

type IEResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

type ReasoningReviewResult = {
  ok: boolean;
  missing: string[];
  notes?: string;
};

type ReasoningResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const extractionSchema = {
  name: "promotion_card_fields",
  schema: {
    type: "object",
    properties: {
      storeName: {
        type: "string",
        description:
          "The store/brand name shown prominently on the image, in Korean if present. Empty string if not visible.",
      },
      dish: {
        type: "string",
        description:
          "The featured menu item or dish name on the image, in Korean if present. Empty string if not visible.",
      },
      benefit: {
        type: "string",
        description:
          "The promotional benefit phrase such as discount, event, new-menu badge, or call-to-action, in Korean if present. Empty string if not visible.",
      },
      koreanText: {
        type: "array",
        items: { type: "string" },
        description: "All distinct Korean text phrases that appear on the image.",
      },
    },
    required: ["storeName", "dish", "benefit", "koreanText"],
  },
};

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function imageContainsPhrase(haystackText: string[], phrase: string): boolean {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return true;
  return haystackText.some((piece) => normalize(piece).includes(normalizedPhrase));
}

function buildMissingList(request: PromotionRequest, extracted: ExtractedFields): string[] {
  const haystack = [
    extracted.storeName ?? "",
    extracted.dish ?? "",
    extracted.benefit ?? "",
    ...(extracted.koreanText ?? []),
  ].filter(Boolean);

  const missing: string[] = [];
  const storeName = request.store.storeName?.trim();
  if (storeName && !imageContainsPhrase(haystack, storeName)) {
    missing.push(`상호명 "${storeName}"`);
  }

  const detail = request.detail?.trim();
  if (detail) {
    const detailTokens = detail.split(/\s+/).filter((t) => t.length >= 2);
    const headline = detailTokens.slice(0, 2).join(" ");
    if (headline && !imageContainsPhrase(haystack, headline)) {
      missing.push(`핵심 메시지 "${headline}"`);
    }
  }

  return missing;
}

export function isUpstageConfigured() {
  return Boolean(process.env.UPSTAGE_API_KEY);
}

async function reviewMissingWithReasoning(
  initialMissing: string[],
  extracted: ExtractedFields,
  request: PromotionRequest,
  attempt: number,
  jobId?: string,
): Promise<ReasoningReviewResult> {
  const baseUrl = process.env.UPSTAGE_BASE_URL ?? "https://api.upstage.ai/v1";
  const model = process.env.UPSTAGE_MODEL ?? "solar-pro3";
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const start = nowMs();

  pipelineLog("verify", "start", jobId, {
    attempt,
    phase: "reasoning",
    initial_missing: initialMissing.length,
  });

  const payload = {
    expectedMissing: initialMissing,
    extracted: {
      storeName: extracted.storeName ?? "",
      dish: extracted.dish ?? "",
      benefit: extracted.benefit ?? "",
      koreanText: extracted.koreanText ?? [],
    },
    request: {
      storeName: request.store.storeName,
      detail: request.detail,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        reasoning_effort: "medium",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are a strict Korean OCR verification judge for promotional cards.",
              "",
              "TASK:",
              "Given (a) a list of expected phrases that a first-pass exact-match check could NOT find in the card,",
              "and (b) the OCR-extracted Korean text fragments from that card,",
              "decide for each expected phrase whether the card actually contains it once minor OCR errors are tolerated.",
              "",
              "ALLOWED tolerances (treat as a match if the only difference is one of these):",
              "- Single jamo (자모) misread, e.g. ㅂ↔ㅍ, ㄴ↔ㄹ, dropped/added final consonant (받침 누락/추가)",
              "- Whitespace, line break, or punctuation differences",
              "- Visually similar character confusion across 1-2 characters in a short phrase",
              "",
              "NOT allowed (must remain missing):",
              "- Completely different word, dish name, brand, or message",
              "- Speculation: do NOT mark a phrase present unless something in the extracted text is clearly its OCR-corrupted form",
              "- Synonyms or paraphrases (e.g. '신메뉴' vs '새 메뉴' is NOT a tolerated match — only OCR-level corruption)",
              "",
              "OUTPUT — strict JSON only, no markdown:",
              '{ "stillMissing": string[], "rationale": string }',
              "- stillMissing MUST be a subset of the input expectedMissing array (use the exact same strings).",
              "- If you judge every expected phrase is present after tolerance, stillMissing is [].",
              "- rationale: one short Korean sentence explaining the judgment (e.g. \"'소마뷴식'은 '소마분식'의 받침 오인식으로 판단\").",
            ].join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      pipelineLog("verify", "fail", jobId, {
        attempt,
        phase: "reasoning",
        http: response.status,
        elapsed_ms: elapsedMs(start),
      });
      return {
        ok: false,
        missing: initialMissing,
        notes: `reasoning fallback (HTTP ${response.status})`,
      };
    }

    const data = (await response.json()) as ReasoningResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      pipelineLog("verify", "fail", jobId, {
        attempt,
        phase: "reasoning",
        reason: "empty",
        elapsed_ms: elapsedMs(start),
      });
      return {
        ok: false,
        missing: initialMissing,
        notes: "reasoning fallback (empty response)",
      };
    }

    let parsed: { stillMissing?: unknown; rationale?: unknown };
    try {
      parsed = JSON.parse(content) as { stillMissing?: unknown; rationale?: unknown };
    } catch {
      pipelineLog("verify", "fail", jobId, {
        attempt,
        phase: "reasoning",
        reason: "parse",
        elapsed_ms: elapsedMs(start),
      });
      return {
        ok: false,
        missing: initialMissing,
        notes: "reasoning fallback (parse error)",
      };
    }

    const rawList = Array.isArray(parsed.stillMissing) ? parsed.stillMissing : null;
    if (!rawList) {
      pipelineLog("verify", "fail", jobId, {
        attempt,
        phase: "reasoning",
        reason: "schema",
        elapsed_ms: elapsedMs(start),
      });
      return {
        ok: false,
        missing: initialMissing,
        notes: "reasoning fallback (schema mismatch)",
      };
    }

    const expectedSet = new Set(initialMissing);
    const stillMissing = rawList
      .map(String)
      .filter((item) => expectedSet.has(item));
    const rationale = typeof parsed.rationale === "string" ? parsed.rationale.slice(0, 200) : "";

    pipelineLog("verify", "done", jobId, {
      attempt,
      phase: "reasoning",
      initial_missing: initialMissing.length,
      still_missing: stillMissing.length,
      elapsed_ms: elapsedMs(start),
    });

    const passed = stillMissing.length === 0;
    return {
      ok: passed,
      missing: stillMissing,
      notes: passed
        ? `reasoning-pass: ${rationale || "OCR 미세 오류를 보정해 통과"}`
        : `reasoning-keep: ${rationale || "여전히 누락"}`,
    };
  } catch {
    pipelineLog("verify", "fail", jobId, {
      attempt,
      phase: "reasoning",
      reason: "exception",
      elapsed_ms: elapsedMs(start),
    });
    return {
      ok: false,
      missing: initialMissing,
      notes: "reasoning fallback (network/timeout)",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyImage(
  pngDataUrl: string,
  request: PromotionRequest,
  attempt: number,
  jobId?: string,
): Promise<Verification> {
  if (!isUpstageConfigured()) {
    return {
      ok: true,
      missing: [],
      extracted: {},
      attempted: attempt,
      skipped: true,
      notes: "UPSTAGE_API_KEY 미설정으로 검증을 건너뛰었습니다.",
    };
  }

  const baseUrl = process.env.UPSTAGE_BASE_URL ?? "https://api.upstage.ai/v1";
  const url = `${baseUrl.replace(/\/$/, "")}/information-extraction`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "information-extract",
        response_format: {
          type: "json_schema",
          json_schema: extractionSchema,
        },
        messages: [
          {
            role: "user",
            content: [{ type: "image_url", image_url: { url: pngDataUrl } }],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: true,
        missing: [],
        extracted: {},
        attempted: attempt,
        skipped: true,
        notes: `Upstage IE HTTP ${response.status} — 검증을 건너뛰었습니다.`,
      };
    }

    const data = (await response.json()) as IEResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {
        ok: true,
        missing: [],
        extracted: {},
        attempted: attempt,
        skipped: true,
        notes: "Upstage IE 응답이 비어 있어 검증을 건너뛰었습니다.",
      };
    }

    let extracted: ExtractedFields = {};
    try {
      extracted = JSON.parse(content) as ExtractedFields;
    } catch {
      return {
        ok: true,
        missing: [],
        extracted: {},
        attempted: attempt,
        skipped: true,
        notes: "Upstage IE 결과 파싱에 실패하여 검증을 건너뛰었습니다.",
      };
    }

    const initialMissing = buildMissingList(request, extracted);
    if (initialMissing.length === 0) {
      return {
        ok: true,
        missing: [],
        extracted,
        attempted: attempt,
      };
    }

    const review = await reviewMissingWithReasoning(
      initialMissing,
      extracted,
      request,
      attempt,
      jobId,
    );

    return {
      ok: review.ok,
      missing: review.missing,
      extracted,
      attempted: attempt,
      notes: review.notes,
    };
  } catch {
    return {
      ok: true,
      missing: [],
      extracted: {},
      attempted: attempt,
      skipped: true,
      notes: "Upstage IE 호출이 실패하여 검증을 건너뛰었습니다.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
