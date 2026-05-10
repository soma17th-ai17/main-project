import { promotionGraph } from "./agent/graph";
import { createMockImage } from "./mock-image";
import type { GeneratedContent, PromotionRequest } from "./types";

export async function createGeneratedContent(request: PromotionRequest): Promise<GeneratedContent> {
  const finalState = await promotionGraph.invoke({ request });

  if (!finalState.copy) {
    throw new Error("Promotion graph produced no copy output");
  }

  const mockMeta = createMockImage(request, finalState.copy.imagePrompt);
  const imageDataUrl = finalState.image?.dataUrl ?? mockMeta.dataUrl;

  return {
    id: crypto.randomUUID(),
    request,
    copyText: finalState.copy.copyText,
    hashtags: finalState.copy.hashtags,
    imagePrompt: finalState.copy.imagePrompt,
    mockImage: { ...mockMeta, dataUrl: imageDataUrl },
    source: finalState.copy.source,
    createdAt: new Date().toISOString(),
    agentTrace: finalState.agentTrace
  };
}
