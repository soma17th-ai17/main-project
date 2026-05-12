type AzureImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

export type GeneratedAzureImage = {
  dataUrl: string;
  source: "azure";
};

export type AzureImageOptions = {
  productImage?: string;
};

const DEFAULT_API_VERSION = "2025-04-01-preview";

const PRODUCT_IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/;

// Azure OpenAI image deployments typically take 30-60s for gpt-image-2 at
// medium quality. 90s gives one retry window before the user-visible timeout
// at the wizard layer (~5min total). Going higher (180s) just makes failures
// feel hung; the upstream pipeline already falls back to a mock on null.
const AZURE_TIMEOUT_MS = 90000;

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

// Azure OpenAI accepts the raw key in `api-key:`. `Authorization: Bearer …` is
// reserved for AAD/Entra JWT tokens — sending an API key as Bearer makes the
// gateway hang until client timeout.
//
// Each call gets its own AbortController so a retry after a 429 has its own
// full timeout budget instead of inheriting the original budget minus
// previous attempt + sleep time.
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

async function logBadResponse(kind: "generations" | "edits", response: Response) {
  let preview = "";
  try {
    preview = (await response.text()).slice(0, 300);
  } catch {
    preview = "<no body>";
  }
  console.error(
    `[azure-image] ${kind} HTTP ${response.status} ${response.statusText}: ${preview}`,
  );
}

async function generateFromText(prompt: string): Promise<GeneratedAzureImage | null> {
  const url = buildEndpointUrl("generations");
  const body = JSON.stringify({
    prompt,
    size: "1024x1024",
    quality: "medium",
    output_format: "png",
    n: 1,
  });

  try {
    let response = await callAzureJson(url, body);

    if (response.status === 429) {
      const text = await response.text();
      const wait = parseRetryAfter(response.headers.get("retry-after"), text);
      console.error(`[azure-image] generations 429 — retrying after ${wait}s`);
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      response = await callAzureJson(url, body);
    }

    if (!response.ok) {
      await logBadResponse("generations", response);
      return null;
    }

    const b64 = await readB64FromResponse(response);
    if (!b64) {
      console.error("[azure-image] generations ok but no b64_json in response");
      return null;
    }

    return { dataUrl: `data:image/png;base64,${b64}`, source: "azure" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[azure-image] generations threw: ${message}`);
    return null;
  }
}

async function editFromReference(
  prompt: string,
  productImage: string,
): Promise<GeneratedAzureImage | null> {
  const blob = dataUrlToBlob(productImage);
  if (!blob) return null;

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

  try {
    let response = await callAzureMultipart(url, buildForm());

    if (response.status === 429) {
      const text = await response.text();
      const wait = parseRetryAfter(response.headers.get("retry-after"), text);
      console.error(`[azure-image] edits 429 — retrying after ${wait}s`);
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      response = await callAzureMultipart(url, buildForm());
    }

    if (!response.ok) {
      await logBadResponse("edits", response);
      return null;
    }

    const b64 = await readB64FromResponse(response);
    if (!b64) {
      console.error("[azure-image] edits ok but no b64_json in response");
      return null;
    }

    return { dataUrl: `data:image/png;base64,${b64}`, source: "azure" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[azure-image] edits threw: ${message}`);
    return null;
  }
}

export async function generateAzureImage(
  prompt: string,
  options: AzureImageOptions = {},
): Promise<GeneratedAzureImage | null> {
  if (!isAzureImageConfigured()) return null;
  if (options.productImage) {
    return editFromReference(prompt, options.productImage);
  }
  return generateFromText(prompt);
}
