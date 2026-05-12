export type Purpose =
  | "new-menu"
  | "event"
  | "daily"
  | "reopening"
  | "review";

export type Tone = "warm" | "trendy" | "premium" | "playful" | "calm";

export type Platform = "instagram" | "naver" | "baemin";

export type StoreProfile = {
  storeName: string;
  category: string;
  vibe: string;
  description?: string;
};

export type PromotionRequest = {
  store: StoreProfile;
  purpose: Purpose;
  detail: string;
  platform?: Platform;
  feedback?: string;
  productImage?: string;
};

export type AgentTrace = {
  step: string;
  summary: string;
};

export type MockImage = {
  title: string;
  palette: string[];
  motif: string;
  dataUrl: string;
};

export type Verification = {
  ok: boolean;
  missing: string[];
  extracted: {
    storeName?: string | null;
    dish?: string | null;
    benefit?: string | null;
    koreanText?: string[];
  };
  attempted: number;
  skipped?: boolean;
  notes?: string;
};

export type SolarCopy = {
  copyText: string;
  hashtags: string[];
  imagePrompt: string;
  tone: string;
  source: "solar" | "fallback";
};

export type ImageFailureReason =
  | "azure-not-configured"
  | "azure-timeout"
  | "azure-429-overload"
  | "azure-http-error"
  | "azure-empty-response"
  | "azure-network-error";

export type ImageFailure = {
  reason: ImageFailureReason;
  // Korean user-facing message.
  message: string;
  // Short technical chip (e.g. "HTTP 503", "Azure 과부하", "300초 초과"). Safe to display.
  shortLabel: string;
  // Optional technical detail (truncated). Not for user display.
  detail?: string;
  occurredAt: string;
};

export type GeneratedImage = {
  dataUrl: string;
  palette: string[];
  title: string;
  motif: string;
};

export type GeneratedContent = {
  id: string;
  request: PromotionRequest;
  copyText: string;
  hashtags: string[];
  imagePrompt: string;
  // Present when Azure produced a real image. When undefined, imageFailure
  // describes why. We no longer auto-substitute a mock SVG so the UI can
  // surface failure explicitly instead of silently swapping in a fake visual.
  image?: GeneratedImage;
  imageFailure?: ImageFailure;
  imageSource: "azure" | "failed";
  agentTrace: AgentTrace[];
  source: "solar" | "fallback";
  verification?: Verification;
  createdAt: string;
};

export type JobStatus = "pending" | "processing" | "done" | "error";

export type JobRecord = {
  id: string;
  status: JobStatus;
  request: PromotionRequest;
  agentTrace: AgentTrace[];
  result?: GeneratedContent;
  error?: string;
  startedAt: string;
  updatedAt: string;
};
