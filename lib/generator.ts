import { createMockImage } from "./mock-image";
import { generateSolarCopy } from "./solar";
import type { GeneratedContent, PromotionRequest } from "./types";

const purposeLabels = {
  "new-menu": "신메뉴",
  event: "이벤트",
  daily: "일상 홍보"
};

export async function createGeneratedContent(request: PromotionRequest): Promise<GeneratedContent> {
  const copy = await generateSolarCopy(request);
  const mockImage = createMockImage(request, copy.imagePrompt);

  return {
    id: crypto.randomUUID(),
    request,
    copyText: copy.copyText,
    hashtags: copy.hashtags,
    imagePrompt: copy.imagePrompt,
    mockImage,
    source: copy.source,
    createdAt: new Date().toISOString(),
    agentTrace: [
      {
        step: "Analyze",
        summary: `${request.store.category || "업종"} 가게의 ${purposeLabels[request.purpose]} 목적을 분석했습니다.`
      },
      {
        step: "Strategy",
        summary: `${copy.tone || request.store.vibe || "친근한"} 톤과 ${request.platform ?? "instagram"} 포맷을 우선했습니다.`
      },
      {
        step: "Text",
        summary: copy.source === "solar" ? "Solar가 홍보 문구를 생성했습니다." : "API 키/호출 문제로 fallback 문구를 사용했습니다."
      },
      {
        step: "Image",
        summary: "실제 이미지 API가 미정이므로 mock 이미지를 생성했습니다."
      },
      {
        step: "Review",
        summary: "과대광고 표현을 피하고 SNS 게시에 맞는 길이로 정리했습니다."
      }
    ]
  };
}
