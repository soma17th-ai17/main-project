import type { CardTemplateId, Palette, PaletteId } from "./types";

export const PALETTES: Record<PaletteId, Palette> = {
  "cream-coral": {
    id: "cream-coral",
    label: "크림 코랄",
    bg: "#fff7ec",
    fg: "#1d1f3a",
    accent: "#ff6b5b",
    pill: "#1d1f3a",
    pillFg: "#fff7ec",
  },
  "mint-navy": {
    id: "mint-navy",
    label: "민트 네이비",
    bg: "#e8f5ee",
    fg: "#0f2235",
    accent: "#1a7a55",
    pill: "#0f2235",
    pillFg: "#fff",
  },
  "butter-tomato": {
    id: "butter-tomato",
    label: "버터 토마토",
    bg: "#fff1c9",
    fg: "#3a1f1f",
    accent: "#d83a26",
    pill: "#3a1f1f",
    pillFg: "#fff1c9",
  },
  "sand-charcoal": {
    id: "sand-charcoal",
    label: "샌드 차콜",
    bg: "#ece4d2",
    fg: "#1a1a1a",
    accent: "#7e6240",
    pill: "#1a1a1a",
    pillFg: "#ece4d2",
  },
  "sky-rose": {
    id: "sky-rose",
    label: "스카이 로즈",
    bg: "#eaf3ff",
    fg: "#21314d",
    accent: "#e84a8d",
    pill: "#21314d",
    pillFg: "#eaf3ff",
  },
};

export const PALETTE_LIST: Palette[] = Object.values(PALETTES);

export interface TemplateMeta {
  id: CardTemplateId;
  label: string;
  blurb: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "headline-strip",
    label: "헤드라인 스트립",
    blurb: "큼직한 카피 + 사진 한 컷. 가장 안전한 첫 카드용 템플릿.",
  },
  {
    id: "polaroid-stack",
    label: "폴라로이드 스택",
    blurb: "사진 두 장이 살짝 겹쳐지는 잡지 무드. 이벤트 / 신메뉴.",
  },
  {
    id: "magazine-cut",
    label: "매거진 컷",
    blurb: "세로 분할 + 따옴표 카피. 후기 / 스토리 카드.",
  },
  {
    id: "ticker-tape",
    label: "티커 테이프",
    blurb: "상단 띠 + 가격 강조. 할인 / 한정 프로모션.",
  },
];
