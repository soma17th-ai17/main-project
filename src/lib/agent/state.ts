import { Annotation } from "@langchain/langgraph";
import type {
  AgentTrace,
  ImageFailure,
  PromotionRequest,
  SolarCopy,
  Verification,
} from "../types";

export type ImageResult = {
  dataUrl: string;
  source: "azure";
};

export const PromotionState = Annotation.Root({
  jobId: Annotation<string | undefined>(),
  request: Annotation<PromotionRequest>(),
  copy: Annotation<SolarCopy | undefined>(),
  image: Annotation<ImageResult | undefined>(),
  imageFailure: Annotation<ImageFailure | undefined>(),
  verification: Annotation<Verification | undefined>(),
  attempt: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  agentTrace: Annotation<AgentTrace[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
});

export type PromotionStateType = typeof PromotionState.State;
