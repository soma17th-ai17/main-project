import { generateAzureImage } from "./image-gen";
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
  const azureImage = await generateAzureImage(copy.imagePrompt);
  const mockImage = createMockImage(request, copy.imagePrompt);
  const finalImage = azureImage ? { ...mockImage, dataUrl: azureImage.dataUrl } : mockImage;
  const imageStepSummary = azureImage
    ? "Azure gpt-image-2가 1024x1024 PNG 시안을 생성했습니다."
    : "이미지 API 호출이 비활성/실패하여 mock 시안으로 대체했습니다.";

  return {
    id: crypto.randomUUID(),
    request,
    copyText: copy.copyText,
    hashtags: copy.hashtags,
    imagePrompt: copy.imagePrompt,
    mockImage: finalImage,
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
        summary: imageStepSummary
      },
      {
        step: "Review",
        summary: "과대광고 표현을 피하고 SNS 게시에 맞는 길이로 정리했습니다."
      }
    ]
  };
}
