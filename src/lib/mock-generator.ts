import type {
  CardCopy,
  CardTemplateId,
  GeneratedCard,
  PaletteId,
  Purpose,
  StoreBrief,
  Tone,
} from "./types";
import { PALETTE_LIST } from "./templates";

const PURPOSE_LABEL: Record<Purpose, string> = {
  "new-menu": "신메뉴",
  event: "이벤트",
  daily: "일상 홍보",
  reopening: "재오픈",
  review: "단골 후기",
};

const TONE_BADGE: Record<Tone, string> = {
  warm: "따뜻한 한 컷",
  trendy: "트렌디 무드",
  premium: "프리미엄",
  playful: "발랄한 인사",
  calm: "차분한 안내",
};

const HASHTAG_BANK: Record<Purpose, string[]> = {
  "new-menu": ["신메뉴", "오늘의추천", "한정수량", "맛집인증"],
  event: ["이벤트", "기간한정", "오픈기념", "선착순"],
  daily: ["동네맛집", "데일리한컷", "사장님추천", "단골환영"],
  reopening: ["재오픈", "그동안감사", "리뉴얼", "다시만나요"],
  review: ["고객후기", "리얼리뷰", "단골인증", "사랑받는메뉴"],
};

function pseudoRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

const TEMPLATES: CardTemplateId[] = [
  "headline-strip",
  "polaroid-stack",
  "magazine-cut",
  "ticker-tape",
];

const PALETTE_IDS: PaletteId[] = PALETTE_LIST.map((p) => p.id);

interface CardSlotInput {
  index: number;
  brief: StoreBrief;
  rnd: () => number;
  photoIds: string[];
}

function buildCopyFor({
  index,
  brief,
  rnd,
}: CardSlotInput): CardCopy {
  const purposeLabel = PURPOSE_LABEL[brief.purpose];
  const toneLabel = TONE_BADGE[brief.tone];
  const tagBank = HASHTAG_BANK[brief.purpose];
  const hashtags = Array.from(
    new Set([
      brief.storeName.replace(/\s+/g, ""),
      brief.category.replace(/\s+/g, ""),
      ...tagBank,
    ])
  ).slice(0, 5);

  const headlines = [
    `${brief.highlight || brief.storeName}, ${purposeLabel}`,
    `오늘은 ${brief.highlight || brief.storeName}`,
    `${brief.storeName}의 ${purposeLabel} 한 컷`,
    `${brief.highlight || brief.category} ${purposeLabel}`,
  ];

  const subheadlines = [
    `BY ${brief.storeName}`,
    `${brief.category} · ${toneLabel}`,
    `${brief.storeName} 사장님이 직접 전하는 ${purposeLabel}`,
    `${brief.category}에서 가장 ${toneLabel}로`,
  ];

  const bodyVariants = [
    [
      `${brief.detail || brief.highlight || brief.storeName}`,
      `${brief.priceText ? brief.priceText + " · " : ""}${purposeLabel} 진행 중`,
    ],
    [
      `${brief.highlight || brief.storeName} 한정으로 선보이는 ${purposeLabel}`,
      `${brief.detail || "방문 전 한 번 더 확인해 주세요."}`,
    ],
    [
      `${brief.category} ${purposeLabel}, ${toneLabel}로 준비했어요`,
      `${brief.detail || brief.highlight || "오늘 저녁, 사진 그대로 만나보세요."}`,
    ],
  ];

  const ctaBank = [
    brief.ctaText || "지금 보러가기",
    "DM으로 문의 주세요",
    "프로필 링크 확인",
    "오늘 저녁 7시까지",
  ];

  return {
    headline: headlines[index % headlines.length],
    subheadline: subheadlines[index % subheadlines.length],
    bodyLines: bodyVariants[index % bodyVariants.length],
    badge: index === 0 ? purposeLabel : toneLabel,
    hashtags,
    cta: pick(ctaBank, rnd),
    pricePill: brief.priceText || (brief.purpose === "event" ? "기간 한정" : undefined),
  };
}

export interface MockGenerationInput {
  brief: StoreBrief;
  photoIds: string[];
  count?: number;
  seed?: string;
}

export function generateMockCards({
  brief,
  photoIds,
  count = 4,
  seed,
}: MockGenerationInput): GeneratedCard[] {
  const seedValue =
    seed ||
    `${brief.storeName}|${brief.category}|${brief.purpose}|${brief.tone}|${brief.highlight}`;
  const rnd = pseudoRandom(seedValue);

  return Array.from({ length: count }, (_, i) => {
    const template = TEMPLATES[i % TEMPLATES.length];
    const palette = PALETTE_IDS[(i + Math.floor(rnd() * PALETTE_IDS.length)) % PALETTE_IDS.length];
    const photoId = photoIds.length ? photoIds[i % photoIds.length] : undefined;
    return {
      id: `card-${i + 1}`,
      template,
      paletteId: palette,
      copy: buildCopyFor({ index: i, brief, rnd, photoIds }),
      photoId,
      mockBackground: photoId
        ? undefined
        : `mock://${brief.purpose}/${brief.tone}/${i}`,
    } satisfies GeneratedCard;
  });
}
