export type Purpose = "new-menu" | "event" | "daily";
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

export type GeneratedContent = {
  id: string;
  request: PromotionRequest;
  copyText: string;
  hashtags: string[];
  imagePrompt: string;
  mockImage: MockImage;
  agentTrace: AgentTrace[];
  source: "solar" | "fallback";
  verification?: Verification;
  createdAt: string;
};

export type SolarCopy = {
  copyText: string;
  hashtags: string[];
  imagePrompt: string;
  tone: string;
  source: "solar" | "fallback";
};
