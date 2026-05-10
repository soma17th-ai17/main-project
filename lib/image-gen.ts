type AzureImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

export type GeneratedAzureImage = {
  dataUrl: string;
  source: "azure";
};

export function isAzureImageConfigured() {
  return Boolean(
    process.env.AZURE_IMAGE_ENDPOINT &&
      process.env.AZURE_IMAGE_DEPLOYMENT &&
      process.env.AZURE_IMAGE_API_KEY
  );
}

async function callAzureOnce(url: string, body: string, signal: AbortSignal) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AZURE_IMAGE_API_KEY}`
    },
    body,
    signal
  });
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

export async function generateAzureImage(prompt: string): Promise<GeneratedAzureImage | null> {
  if (!isAzureImageConfigured()) {
    return null;
  }

  const endpoint = process.env.AZURE_IMAGE_ENDPOINT!.replace(/\/$/, "");
  const deployment = process.env.AZURE_IMAGE_DEPLOYMENT!;
  const apiVersion = process.env.AZURE_IMAGE_API_VERSION ?? "2024-02-01";
  const url = `${endpoint}/openai/deployments/${deployment}/images/generations?api-version=${apiVersion}`;
  const body = JSON.stringify({
    prompt,
    size: "1024x1024",
    quality: "low",
    output_format: "png",
    n: 1
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    let response = await callAzureOnce(url, body, controller.signal);

    if (response.status === 429) {
      const text = await response.text();
      const wait = parseRetryAfter(response.headers.get("retry-after"), text);
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      response = await callAzureOnce(url, body, controller.signal);
    }

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as AzureImageResponse;
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      return null;
    }

    return {
      dataUrl: `data:image/png;base64,${b64}`,
      source: "azure"
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
