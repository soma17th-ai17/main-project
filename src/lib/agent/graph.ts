import { END, START, StateGraph } from "@langchain/langgraph";
import { copyWriter } from "./nodes/copy-writer";
import { imageGenerator } from "./nodes/image-generator";
import { verifier } from "./nodes/verifier";
import { PromotionState, type PromotionStateType } from "./state";

const MAX_VERIFY_ATTEMPTS = 2;

// When image generation fails we route directly to END so the user can see
// the explicit failure card in the UI. We no longer fall through to a mock
// fallback node — silent mock substitution was misleading users into thinking
// generation succeeded.
function routeAfterImage(state: PromotionStateType): "verify" | "end" {
  return state.image ? "verify" : "end";
}

function routeAfterVerify(state: PromotionStateType): "end" | "retry" {
  const verification = state.verification;
  if (!verification) return "end";
  if (verification.ok || verification.skipped) return "end";
  if ((state.attempt ?? 0) >= MAX_VERIFY_ATTEMPTS) return "end";
  return "retry";
}

export const promotionGraph = new StateGraph(PromotionState)
  .addNode("copyWriter", copyWriter)
  .addNode("imageGenerator", imageGenerator)
  .addNode("verifier", verifier)
  .addEdge(START, "copyWriter")
  .addEdge("copyWriter", "imageGenerator")
  .addConditionalEdges("imageGenerator", routeAfterImage, {
    verify: "verifier",
    end: END,
  })
  .addConditionalEdges("verifier", routeAfterVerify, {
    end: END,
    retry: "copyWriter",
  })
  .compile();
