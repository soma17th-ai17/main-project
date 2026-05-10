export type Purpose =
  | "new-menu"
  | "event"
  | "daily"
  | "reopening"
  | "review";

export type Tone = "warm" | "trendy" | "premium" | "playful" | "calm";

export type CardTemplateId =
  | "headline-strip"
  | "polaroid-stack"
  | "magazine-cut"
  | "ticker-tape";

export interface StoreBrief {
  storeName: string;
  category: string;
  purpose: Purpose;
  tone: Tone;
  highlight: string;
  detail: string;
  ctaText?: string;
  priceText?: string;
}

export interface CardCopy {
  headline: string;
  subheadline: string;
  bodyLines: string[];
  badge?: string;
  hashtags: string[];
  cta?: string;
  pricePill?: string;
}

export interface GeneratedCard {
  id: string;
  template: CardTemplateId;
  copy: CardCopy;
  paletteId: PaletteId;
  imageUrl?: string;
  imageSource?: "gpt-image-2" | "mock";
  mockBackground?: string;
}

export interface GenerationResult {
  id: string;
  createdAt: string;
  brief: StoreBrief;
  cards: GeneratedCard[];
  source: "solar" | "fallback";
  imageSource: "gpt-image-2" | "mock";
  notes?: string;
}

export type PaletteId =
  | "cream-coral"
  | "mint-navy"
  | "butter-tomato"
  | "sand-charcoal"
  | "sky-rose";

export interface Palette {
  id: PaletteId;
  label: string;
  bg: string;
  fg: string;
  accent: string;
  pill: string;
  pillFg: string;
}
