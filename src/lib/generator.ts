import { promotionGraph } from "./agent/graph";
import { createMockImage } from "./mock-image";
import { pipelineLog, nowMs, elapsedMs } from "./pipeline-log";
import { patchJob } from "./store";
import type { GeneratedContent, PromotionRequest } from "./types";
import type { PromotionStateType } from "./agent/state";

export async function runPromotionJob(
  jobId: string,
  request: PromotionRequest,
): Promise<void> {
  const start = nowMs();
  pipelineLog("request", "accepted", jobId, {
    purpose: request.purpose,
    platform: request.platform ?? "instagram",
    has_feedback: Boolean(request.feedback?.trim()),
    has_product_image: Boolean(request.productImage),
  });

  await patchJob(jobId, { status: "processing", agentTrace: [] });

  try {
    let lastState: PromotionStateType | undefined;

    for await (const chunk of await promotionGraph.stream(
      { request, jobId },
      { streamMode: "values" },
    )) {
      lastState = chunk as PromotionStateType;
      await patchJob(jobId, {
        agentTrace: lastState.agentTrace ?? [],
      });
    }

    if (!lastState?.copy) {
      throw new Error("Promotion graph produced no copy output.");
    }

    // Mock metadata (palette/title/motif) is still computed because the UI
    // uses palette accents around the image card. The image dataUrl itself
    // is NEVER substituted with the mock SVG — that was the misleading
    // behavior the user reported. If Azure failed, result.image is undefined
    // and result.imageFailure carries the reason.
    const mockMeta = createMockImage(request, lastState.copy.imagePrompt);

    let resultImage: GeneratedContent["image"];
    let imageSource: GeneratedContent["imageSource"];
    if (lastState.image) {
      resultImage = {
        dataUrl: lastState.image.dataUrl,
        palette: mockMeta.palette,
        title: mockMeta.title,
        motif: mockMeta.motif,
      };
      imageSource = "azure";
    } else {
      resultImage = undefined;
      imageSource = "failed";
    }

    const result: GeneratedContent = {
      id: jobId,
      request,
      copyText: lastState.copy.copyText,
      hashtags: lastState.copy.hashtags,
      imagePrompt: lastState.copy.imagePrompt,
      image: resultImage,
      imageFailure: lastState.imageFailure,
      imageSource,
      source: lastState.copy.source,
      verification: lastState.verification,
      createdAt: new Date().toISOString(),
      agentTrace: lastState.agentTrace ?? [],
    };

    pipelineLog("result", "done", jobId, {
      elapsed_ms: elapsedMs(start),
      image_source: imageSource,
      failure_reason: lastState.imageFailure?.reason,
      copy_source: lastState.copy.source,
      verify_attempts: lastState.attempt ?? 0,
    });

    await patchJob(jobId, {
      status: "done",
      result,
      agentTrace: result.agentTrace,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    pipelineLog("result", "fail", jobId, {
      elapsed_ms: elapsedMs(start),
      error: message,
    });
    await patchJob(jobId, { status: "error", error: message });
  }
}
