import { createMockImage } from "../../mock-image";
import type { PromotionStateType } from "../state";

export async function mockFallback(state: PromotionStateType) {
  const prompt = state.copy?.imagePrompt ?? "Promotion image placeholder";
  const mock = createMockImage(state.request, prompt);
  return {
    image: { dataUrl: mock.dataUrl, source: "mock" as const },
    agentTrace: [
      {
        step: "MockFallback",
        summary: "SVG mock 시안으로 안전하게 대체했습니다."
      }
    ]
  };
}
