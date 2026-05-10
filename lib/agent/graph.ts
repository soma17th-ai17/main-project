import { END, START, StateGraph } from "@langchain/langgraph";
import { copyWriter } from "./nodes/copy-writer";
import { imageGenerator } from "./nodes/image-generator";
import { mockFallback } from "./nodes/mock-fallback";
import { PromotionState, type PromotionStateType } from "./state";

function routeAfterImage(state: PromotionStateType): "success" | "fallback" {
  return state.image ? "success" : "fallback";
}

export const promotionGraph = new StateGraph(PromotionState)
  .addNode("copyWriter", copyWriter)
  .addNode("imageGenerator", imageGenerator)
  .addNode("mockFallback", mockFallback)
  .addEdge(START, "copyWriter")
  .addEdge("copyWriter", "imageGenerator")
  .addConditionalEdges("imageGenerator", routeAfterImage, {
    success: END,
    fallback: "mockFallback"
  })
  .addEdge("mockFallback", END)
  .compile();
