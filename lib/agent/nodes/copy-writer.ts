import { generateSolarCopy } from "../../solar";
import type { PromotionRequest } from "../../types";
import type { PromotionStateType } from "../state";

function buildRetryFeedback(state: PromotionStateType): string | undefined {
  const baseFeedback = state.request.feedback?.trim();
  const missing = state.verification?.missing ?? [];
  if (missing.length === 0) {
    return baseFeedback;
  }
  const missingNote = `이전 시안에서 다음 정보가 이미지에 충분히 드러나지 않았습니다: ${missing.join(", ")}. 이번에는 imagePrompt에서 해당 한국어 문구가 카드 면적의 30% 이상으로 또렷하게 보이도록 강조해주세요.`;
  return baseFeedback ? `${baseFeedback}\n${missingNote}` : missingNote;
}

export async function copyWriter(state: PromotionStateType) {
  const retryFeedback = buildRetryFeedback(state);
  const requestForRun: PromotionRequest = retryFeedback
    ? { ...state.request, feedback: retryFeedback }
    : state.request;

  const copy = await generateSolarCopy(requestForRun);
  const isRetry = (state.attempt ?? 0) > 0;
  const baseSummary = copy.source === "solar"
    ? `Solar Pro 3가 ${copy.copyText.length}자 카피와 해시태그 ${copy.hashtags.length}개를 생성했습니다.`
    : "Solar 호출이 비활성/실패하여 fallback 카피로 대체했습니다.";
  const summary = isRetry ? `${baseSummary} (검증 피드백 반영 재시도)` : baseSummary;

  return {
    copy,
    image: undefined,
    agentTrace: [{ step: "CopyWriter", summary }]
  };
}
