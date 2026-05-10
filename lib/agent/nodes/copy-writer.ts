import { generateSolarCopy } from "../../solar";
import type { PromotionStateType } from "../state";

export async function copyWriter(state: PromotionStateType) {
  const copy = await generateSolarCopy(state.request);
  const summary = copy.source === "solar"
    ? `Solar Pro 3가 ${copy.copyText.length}자 카피와 해시태그 ${copy.hashtags.length}개를 생성했습니다.`
    : "Solar 호출이 비활성/실패하여 fallback 카피로 대체했습니다.";

  return {
    copy,
    agentTrace: [{ step: "CopyWriter", summary }]
  };
}
