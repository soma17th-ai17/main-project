import { generateAzureImage } from "../../image-gen";
import type { PromotionStateType } from "../state";

export async function imageGenerator(state: PromotionStateType) {
  if (!state.copy) {
    return {
      agentTrace: [
        {
          step: "ImageGenerator",
          summary: "이전 단계 카피가 비어 있어 Mock 분기로 라우팅합니다."
        }
      ]
    };
  }

  const result = await generateAzureImage(state.copy.imagePrompt);
  if (result) {
    return {
      image: { dataUrl: result.dataUrl, source: "azure" as const },
      agentTrace: [
        {
          step: "ImageGenerator",
          summary: "Azure gpt-image-2가 1024x1024 PNG 시안을 생성했습니다."
        }
      ]
    };
  }

  return {
    agentTrace: [
      {
        step: "ImageGenerator",
        summary: "Azure 호출이 실패하여 MockFallback 분기로 라우팅합니다."
      }
    ]
  };
}
