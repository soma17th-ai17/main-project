import { generateSolarCopy } from "../../solar";
import { pipelineLog, nowMs, elapsedMs } from "../../pipeline-log";
import type { PromotionRequest } from "../../types";
import type { PromotionStateType } from "../state";

// Wrap the user's feedback with a clear high-priority marker so the Solar
// system prompt rule "feedback is a HIGH-PRIORITY override" lands deterministically.
// Without this, short feedback like "더 발랄하게" easily gets diluted by the
// surrounding tone/category fields and prior-attempt assumptions.
function decorateUserFeedback(raw: string): string {
  return [
    "[USER FEEDBACK — HIGH PRIORITY OVERRIDE]",
    raw,
    "Apply the above as the dominant instruction. It overrides any earlier assumption about tone, audience, key message, hashtag direction, or image scene whenever there is a conflict.",
  ].join("\n");
}

function buildRetryFeedback(state: PromotionStateType): string | undefined {
  const baseFeedbackRaw = state.request.feedback?.trim();
  const baseFeedback = baseFeedbackRaw ? decorateUserFeedback(baseFeedbackRaw) : undefined;
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

  const start = nowMs();
  const attempt = (state.attempt ?? 0) + 1;
  pipelineLog("copy", "start", state.jobId, {
    attempt,
    has_feedback: Boolean(state.request.feedback?.trim()),
  });

  const copy = await generateSolarCopy(requestForRun);

  pipelineLog("copy", "done", state.jobId, {
    attempt,
    elapsed_ms: elapsedMs(start),
    source: copy.source,
    copy_chars: copy.copyText.length,
    hashtags: copy.hashtags.length,
  });

  const isRetry = (state.attempt ?? 0) > 0;
  const baseSummary = `홍보 문구 ${copy.copyText.length}자와 해시태그 ${copy.hashtags.length}개를 작성했어요.`;
  const summary = isRetry ? `${baseSummary} (피드백을 반영해 다시 작성)` : baseSummary;

  return {
    copy,
    image: undefined,
    imageFailure: undefined,
    agentTrace: [{ step: "CopyWriter", summary }],
  };
}
