import { pipelineLog, nowMs, elapsedMs } from "./pipeline-log";
import type { ImageFailure } from "./types";

type AzureImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

export type AzureImageOk = {
  kind: "ok";
  dataUrl: string;
};

export type AzureImageFail = {
  kind: "fail";
  failure: ImageFailure;
};

export type AzureImageResult = AzureImageOk | AzureImageFail;

export type AzureImageOptions = {
  productImage?: string;
  jobId?: string;
};

const DEFAULT_API_VERSION = "2025-04-01-preview";

const PRODUCT_IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/;

// Azure OpenAI gpt-image-2 at "medium" quality typically returns in 30-60s.
// 300s (5분) gives headroom for slow Azure responses; per-call (not per-pipeline) so the
// 429 retry path has its own budget instead of inheriting a shared deadline.
const AZURE_TIMEOUT_MS = 300000;

export function isAzureImageConfigured() {
  return Boolean(
    process.env.AZURE_IMAGE_ENDPOINT &&
      process.env.AZURE_IMAGE_DEPLOYMENT &&
      process.env.AZURE_IMAGE_API_KEY,
  );
}

function buildEndpointUrl(path: "generations" | "edits") {
  const endpoint = process.env.AZURE_IMAGE_ENDPOINT!.replace(/\/$/, "");
  const deployment = process.env.AZURE_IMAGE_DEPLOYMENT!;
  const apiVersion = process.env.AZURE_IMAGE_API_VERSION ?? DEFAULT_API_VERSION;
  return `${endpoint}/openai/deployments/${deployment}/images/${path}?api-version=${apiVersion}`;
}

// Azure OpenAI accepts the raw key via `api-key:`. `Authorization: Bearer …`
// is reserved for AAD/Entra JWT tokens — sending an API key as Bearer makes
// the gateway hang. Each call gets its own AbortController so a 429-retry has
// its own full timeout budget.
async function callAzureJson(url: string, body: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AZURE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.AZURE_IMAGE_API_KEY!,
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function callAzureMultipart(url: string, form: FormData): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AZURE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "api-key": process.env.AZURE_IMAGE_API_KEY!,
      },
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseRetryAfter(headerValue: string | null, bodyText: string): number {
  if (headerValue) {
    const seconds = Number.parseInt(headerValue, 10);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 30);
  }
  const match = bodyText.match(/retry after (\d+)\s*seconds?/i);
  if (match) {
    const seconds = Number.parseInt(match[1], 10);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 30);
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

async function readB64FromResponse(response: Response): Promise<string | null> {
  const data = (await response.json()) as AzureImageResponse;
  return data.data?.[0]?.b64_json ?? null;
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
      "azure-timeout",
      `Azure 이미지 응답이 ${seconds}초 안에 오지 않아 중단했어요. 잠시 후 다시 시도해 주세요.`,
      `요청 시간 초과 (${seconds}s)`,
      detail,
    );
  }
  return makeFailure(
    "azure-network-error",
    "Azure 이미지 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
    "네트워크 오류",
    detail,
  );
}

async function handleResponse(
  kind: "generations" | "edits",
  response: Response,
  jobId: string | undefined,
  startMs: number,
): Promise<AzureImageResult> {
  if (response.status === 429) {
    const text = await response.text().catch(() => "");
    pipelineLog("image", "fail", jobId, {
      kind,
      reason: "azure-429-overload",
      http: 429,
      elapsed_ms: elapsedMs(startMs),
      detail: text.slice(0, 160),
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "azure-429-overload",
        "Azure 이미지 서비스가 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.",
        "Azure 과부하 (429)",
        text.slice(0, 160),
      ),
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    pipelineLog("image", "fail", jobId, {
      kind,
      reason: "azure-http-error",
      http: response.status,
      elapsed_ms: elapsedMs(startMs),
      detail: text.slice(0, 160),
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "azure-http-error",
        `Azure 이미지 서비스 오류 (HTTP ${response.status}). 잠시 후 다시 시도해 주세요.`,
        `HTTP ${response.status}`,
        text.slice(0, 160),
      ),
    };
  }

  const b64 = await readB64FromResponse(response);
  if (!b64) {
    pipelineLog("image", "fail", jobId, {
      kind,
      reason: "azure-empty-response",
      elapsed_ms: elapsedMs(startMs),
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "azure-empty-response",
        "Azure에서 빈 응답을 받았어요. 다시 시도해 주세요.",
        "빈 응답",
      ),
    };
  }

  pipelineLog("image", "done", jobId, {
    kind,
    elapsed_ms: elapsedMs(startMs),
    source: "azure",
  });
  return { kind: "ok", dataUrl: `data:image/png;base64,${b64}` };
}

async function generateFromText(
  prompt: string,
  jobId: string | undefined,
): Promise<AzureImageResult> {
  const url = buildEndpointUrl("generations");
  const body = JSON.stringify({
    prompt,
    size: "1024x1024",
    quality: "medium",
    output_format: "png",
    n: 1,
  });

  const start = nowMs();
  pipelineLog("image", "start", jobId, { kind: "generations" });

  try {
    let response = await callAzureJson(url, body);

    if (response.status === 429) {
      const text = await response.text();
      const wait = parseRetryAfter(response.headers.get("retry-after"), text);
      pipelineLog("image", "retry", jobId, {
        kind: "generations",
        reason: "429",
        wait_s: wait,
        elapsed_ms: elapsedMs(start),
      });
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      response = await callAzureJson(url, body);
    }

    return await handleResponse("generations", response, jobId, start);
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
): Promise<AzureImageResult> {
  const blob = dataUrlToBlob(productImage);
  if (!blob) {
    pipelineLog("image", "fail", jobId, {
      kind: "edits",
      reason: "invalid-product-image",
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "azure-empty-response",
        "올려주신 사진을 읽을 수 없어요. 다른 사진으로 다시 시도해 주세요.",
        "사진 형식 오류",
      ),
    };
  }

  const url = buildEndpointUrl("edits");

  const buildForm = () => {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("n", "1");
    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("output_format", "png");
    form.append("image", blob.blob, blob.filename);
    return form;
  };

  const start = nowMs();
  pipelineLog("image", "start", jobId, { kind: "edits", has_product_image: true });

  try {
    let response = await callAzureMultipart(url, buildForm());

    if (response.status === 429) {
      const text = await response.text();
      const wait = parseRetryAfter(response.headers.get("retry-after"), text);
      pipelineLog("image", "retry", jobId, {
        kind: "edits",
        reason: "429",
        wait_s: wait,
        elapsed_ms: elapsedMs(start),
      });
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      response = await callAzureMultipart(url, buildForm());
    }

    return await handleResponse("edits", response, jobId, start);
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

export async function generateAzureImage(
  prompt: string,
  options: AzureImageOptions = {},
): Promise<AzureImageResult> {
  if (!isAzureImageConfigured()) {
    pipelineLog("image", "fail", options.jobId, {
      reason: "azure-not-configured",
    });
    return {
      kind: "fail",
      failure: makeFailure(
        "azure-not-configured",
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
