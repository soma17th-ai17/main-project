import { pipelineLog, nowMs, elapsedMs } from "./pipeline-log";
import type { ImageFailure } from "./types";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

type TimedOpenAIResponse = {
  response: Response;
  clearTimeout: () => void;
};

export type OpenAIImageOk = {
  kind: "ok";
  dataUrl: string;
};

export type OpenAIImageFail = {
  kind: "fail";
  failure: ImageFailure;
};

export type OpenAIImageResult = OpenAIImageOk | OpenAIImageFail;

export type OpenAIImageOptions = {
  productImage?: string;
  jobId?: string;
};

const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";

const PRODUCT_IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/;

// OpenAI gpt-image-2 at "medium" quality can be slow during heavy load.
// 300s (5분) gives headroom for slow responses; per-call (not per-pipeline) so the
// 429 retry path has its own budget instead of inheriting a shared deadline.
const OPENAI_TIMEOUT_MS = 300000;
// Respect explicit Retry-After guidance, but keep enough budget for the
// one retried image call under the route's 300s+ execution window.
const RETRY_AFTER_CAP_SECONDS = 90;

class OpenAIConfigError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured.");
    this.name = "OpenAIConfigError";
  }
}

export function isOpenAIImageConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function buildEndpointUrl(path: "generations" | "edits") {
  return `https://api.openai.com/v1/images/${path}`;
}

function getOpenAIImageModel() {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_IMAGE_MODEL;
}

function getOpenAIApiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new OpenAIConfigError();
  return key;
}

// Each call gets its own AbortController so a 429 retry has its own full
// timeout budget instead of sharing a stale deadline.
async function callOpenAIJson(
  url: string,
  body: string,
): Promise<TimedOpenAIResponse> {
  const apiKey = getOpenAIApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: controller.signal,
    });
    return {
      response,
      clearTimeout: () => clearTimeout(timeout),
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function callOpenAIMultipart(
  url: string,
  form: FormData,
): Promise<TimedOpenAIResponse> {
  const apiKey = getOpenAIApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
      signal: controller.signal,
    });
    return {
      response,
      clearTimeout: () => clearTimeout(timeout),
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function parseRetryAfter(headerValue: string | null, bodyText: string): number {
  if (headerValue) {
    const seconds = Number.parseInt(headerValue, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds, RETRY_AFTER_CAP_SECONDS);
    }
  }
  const match = bodyText.match(/retry after (\d+)\s*seconds?/i);
  if (match) {
    const seconds = Number.parseInt(match[1], 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds, RETRY_AFTER_CAP_SECONDS);
    }
  }
  return 15;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; filename: string } | null {
  const match = dataUrl.match(PRODUCT_IMAGE_DATA_URL);
  if (!match) return null;
  const mime = match[1] === "jpg" ? "jpeg" : match[1];
  const ext = mime === "jpeg" ? "jpg" : mime;
  try {
    const bytes = Buffer.from(match[2], "base64");
    return {
      blob: new Blob([new Uint8Array(bytes)], { type: `image/${mime}` }),
      filename: `product-reference.${ext}`,
    };
  } catch {
    return null;
  }
}

async function readTextFromResponse(result: TimedOpenAIResponse): Promise<string> {
  try {
    return await result.response.text();
  } finally {
    result.clearTimeout();
  }
}

async function readB64FromResponse(
  result: TimedOpenAIResponse,
): Promise<string | null> {
  try {
    const data = (await result.response.json()) as OpenAIImageResponse;
    return data.data?.[0]?.b64_json ?? null;
  } finally {
    result.clearTimeout();
  }
}

function makeFailure(
  reason: ImageFailure["reason"],
  message: string,
  shortLabel: string,
  detail?: string,
): ImageFailure {
  return {
    reason,
    message,
    shortLabel,
    detail: detail ? detail.slice(0, 300) : undefined,
    occurredAt: new Date().toISOString(),
  };
}

function classifyThrown(err: unknown, elapsed: number): ImageFailure {
  if (err instanceof OpenAIConfigError) {
    return makeFailure(
      "openai-not-configured",
      "이미지 생성에 필요한 환경 변수가 설정되지 않았어요.",
      "환경변수 미설정",
      err.message,
    );
  }

  // Node's undici raises DOMException with name "AbortError" when our timer
  // fires controller.abort(). Other thrown errors (DNS, socket reset) carry
  // different names. We surface our own timeout vs anything else.
  const isAbort =
    err instanceof Error &&
    (err.name === "AbortError" ||
      err.message.includes("aborted") ||
      err.message.includes("Aborted"));
  const detail = err instanceof Error ? err.message : String(err);
  if (isAbort) {
    const seconds = Math.round(elapsed / 1000);
    return makeFailure(
      "openai-timeout",
      `OpenAI 이미지 응답이 ${seconds}초 안에 오지 않아 중단했어요. 잠시 후 다시 시도해 주세요.`,
      `요청 시간 초과 (${seconds}s)`,
      detail,
    );
  }
  return makeFailure(
    "openai-network-error",
    "OpenAI 이미지 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
    "네트워크 오류",
    detail,
  );
}

async function handleResponse(
  kind: "generations" | "edits",
  result: TimedOpenAIResponse,
  jobId: string | undefined,
  startMs: number,
): Promise<OpenAIImageResult> {
  const { response } = result;
  if (response.status === 429) {
    const text = await readTextFromResponse(result);
    pipelineLog("image", "fail", jobId, {
      kind,
      reason: "openai-429-overload",
      http: 429,
      elapsed_ms: elapsedMs(startMs),
      detail: text.slice(0, 160),
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "openai-429-overload",
        "OpenAI 이미지 서비스가 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.",
        "OpenAI 과부하 (429)",
        text.slice(0, 160),
      ),
    };
  }

  if (!response.ok) {
    const text = await readTextFromResponse(result);
    pipelineLog("image", "fail", jobId, {
      kind,
      reason: "openai-http-error",
      http: response.status,
      elapsed_ms: elapsedMs(startMs),
      detail: text.slice(0, 160),
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "openai-http-error",
        `OpenAI 이미지 서비스 오류 (HTTP ${response.status}). 잠시 후 다시 시도해 주세요.`,
        `HTTP ${response.status}`,
        text.slice(0, 160),
      ),
    };
  }

  const b64 = await readB64FromResponse(result);
  if (!b64) {
    pipelineLog("image", "fail", jobId, {
      kind,
      reason: "openai-empty-response",
      elapsed_ms: elapsedMs(startMs),
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "openai-empty-response",
        "OpenAI에서 빈 응답을 받았어요. 다시 시도해 주세요.",
        "빈 응답",
      ),
    };
  }

  pipelineLog("image", "done", jobId, {
    kind,
    elapsed_ms: elapsedMs(startMs),
    source: "openai",
  });
  return { kind: "ok", dataUrl: `data:image/png;base64,${b64}` };
}

async function generateFromText(
  prompt: string,
  jobId: string | undefined,
): Promise<OpenAIImageResult> {
  const url = buildEndpointUrl("generations");
  const body = JSON.stringify({
    model: getOpenAIImageModel(),
    prompt,
    size: "1024x1024",
    quality: "medium",
    output_format: "png",
    n: 1,
  });

  const start = nowMs();
  pipelineLog("image", "start", jobId, {
    kind: "generations",
    model: getOpenAIImageModel(),
  });

  try {
    let result = await callOpenAIJson(url, body);

    if (result.response.status === 429) {
      const retryAfter = result.response.headers.get("retry-after");
      const text = await readTextFromResponse(result);
      const wait = parseRetryAfter(retryAfter, text);
      pipelineLog("image", "retry", jobId, {
        kind: "generations",
        reason: "429",
        wait_s: wait,
        elapsed_ms: elapsedMs(start),
      });
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      result = await callOpenAIJson(url, body);
    }

    return await handleResponse("generations", result, jobId, start);
  } catch (err) {
    const elapsed = elapsedMs(start);
    const failure = classifyThrown(err, elapsed);
    pipelineLog("image", "fail", jobId, {
      kind: "generations",
      reason: failure.reason,
      elapsed_ms: elapsed,
      detail: failure.detail,
    });
    return { kind: "fail", failure };
  }
}

async function editFromReference(
  prompt: string,
  productImage: string,
  jobId: string | undefined,
): Promise<OpenAIImageResult> {
  const blob = dataUrlToBlob(productImage);
  if (!blob) {
    pipelineLog("image", "fail", jobId, {
      kind: "edits",
      reason: "invalid-product-image",
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "invalid-product-image",
        "올려주신 사진을 읽을 수 없어요. 다른 사진으로 다시 시도해 주세요.",
        "사진 형식 오류",
      ),
    };
  }

  const url = buildEndpointUrl("edits");

  const buildForm = () => {
    const form = new FormData();
    form.append("model", getOpenAIImageModel());
    form.append("prompt", prompt);
    form.append("n", "1");
    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("output_format", "png");
    form.append("image", blob.blob, blob.filename);
    return form;
  };

  const start = nowMs();
  pipelineLog("image", "start", jobId, {
    kind: "edits",
    has_product_image: true,
    model: getOpenAIImageModel(),
  });

  try {
    let result = await callOpenAIMultipart(url, buildForm());

    if (result.response.status === 429) {
      const retryAfter = result.response.headers.get("retry-after");
      const text = await readTextFromResponse(result);
      const wait = parseRetryAfter(retryAfter, text);
      pipelineLog("image", "retry", jobId, {
        kind: "edits",
        reason: "429",
        wait_s: wait,
        elapsed_ms: elapsedMs(start),
      });
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      result = await callOpenAIMultipart(url, buildForm());
    }

    return await handleResponse("edits", result, jobId, start);
  } catch (err) {
    const elapsed = elapsedMs(start);
    const failure = classifyThrown(err, elapsed);
    pipelineLog("image", "fail", jobId, {
      kind: "edits",
      reason: failure.reason,
      elapsed_ms: elapsed,
      detail: failure.detail,
    });
    return { kind: "fail", failure };
  }
}

export async function generateOpenAIImage(
  prompt: string,
  options: OpenAIImageOptions = {},
): Promise<OpenAIImageResult> {
  if (!isOpenAIImageConfigured()) {
    pipelineLog("image", "fail", options.jobId, {
      reason: "openai-not-configured",
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "openai-not-configured",
        "이미지 생성에 필요한 환경 변수가 설정되지 않았어요.",
        "환경변수 미설정",
      ),
    };
  }
  if (options.productImage) {
    return editFromReference(prompt, options.productImage, options.jobId);
  }
  return generateFromText(prompt, options.jobId);
}
