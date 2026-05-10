import { verifyImage } from "../../verify";
import type { PromotionStateType } from "../state";

export async function verifier(state: PromotionStateType) {
  const attempt = (state.attempt ?? 0) + 1;

  if (!state.image || state.image.source !== "azure") {
    return {
      attempt,
      verification: {
        ok: true,
        missing: [],
        extracted: {},
        attempted: attempt,
        skipped: true,
        notes: "Mock 이미지는 검증을 생략했습니다."
      },
      agentTrace: [
        {
          step: "Verifier",
          summary: "Mock 분기로 들어와 OCR 검증을 건너뛰었습니다."
        }
      ]
    };
  }

  const verification = await verifyImage(state.image.dataUrl, state.request, attempt);

  let summary: string;
  if (verification.skipped) {
    summary = `Upstage IE 검증 생략: ${verification.notes ?? "사유 미상"}`;
  } else if (verification.ok) {
    summary = `Upstage IE가 핵심 키워드 정합을 확인했습니다 (시도 ${attempt}회).`;
  } else {
    summary = `Upstage IE가 누락 항목을 검출했습니다: ${verification.missing.join(", ")} (시도 ${attempt}회).`;
  }

  return {
    attempt,
    verification,
    agentTrace: [{ step: "Verifier", summary }]
  };
}
