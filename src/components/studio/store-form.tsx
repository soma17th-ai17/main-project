"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Purpose, StoreBrief, Tone } from "@/lib/types";

const PURPOSE_OPTIONS: { value: Purpose; label: string; helper: string }[] = [
  { value: "new-menu", label: "신메뉴 / 신상품", helper: "오늘 새로 올라온 메뉴 알리기" },
  { value: "event", label: "이벤트 / 할인", helper: "기간 한정 프로모션, 쿠폰" },
  { value: "daily", label: "일상 홍보", helper: "오늘의 한 컷, 단골 인사" },
  { value: "reopening", label: "재오픈 / 리뉴얼", helper: "다시 열어요, 새 단장" },
  { value: "review", label: "단골 후기", helper: "찾아주신 분들 이야기" },
];

const TONE_OPTIONS: { value: Tone; label: string; emoji: string }[] = [
  { value: "warm", label: "따뜻한", emoji: "🍞" },
  { value: "trendy", label: "트렌디", emoji: "✨" },
  { value: "premium", label: "프리미엄", emoji: "🍷" },
  { value: "playful", label: "발랄한", emoji: "🎈" },
  { value: "calm", label: "차분한", emoji: "🌿" },
];

interface StoreFormProps {
  value: StoreBrief;
  onChange: (next: StoreBrief) => void;
}

export function StoreForm({ value, onChange }: StoreFormProps) {
  const ids = {
    storeName: useId(),
    category: useId(),
    purpose: useId(),
    tone: useId(),
    highlight: useId(),
    detail: useId(),
    cta: useId(),
    price: useId(),
  };

  const update = <K extends keyof StoreBrief>(key: K, v: StoreBrief[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={ids.storeName}>가게명</Label>
          <Input
            id={ids.storeName}
            value={value.storeName}
            onChange={(e) => update("storeName", e.target.value)}
            placeholder="예) 카페 하루의 봄"
            maxLength={40}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={ids.category}>업종</Label>
          <Input
            id={ids.category}
            value={value.category}
            onChange={(e) => update("category", e.target.value)}
            placeholder="예) 브런치 카페"
            maxLength={40}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={ids.purpose}>홍보 목적</Label>
          <Select
            value={value.purpose}
            onValueChange={(v) => update("purpose", v as Purpose)}
          >
            <SelectTrigger id={ids.purpose} className="h-12 w-full">
              <SelectValue placeholder="목적을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {PURPOSE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(() => {
            const cur = PURPOSE_OPTIONS.find((o) => o.value === value.purpose);
            return cur ? (
              <p className="text-xs text-muted-foreground">{cur.helper}</p>
            ) : null;
          })()}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.tone}>톤</Label>
          <Select value={value.tone} onValueChange={(v) => update("tone", v as Tone)}>
            <SelectTrigger id={ids.tone} className="h-12 w-full">
              <SelectValue placeholder="가게 톤을 골라주세요" />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  textValue={`${opt.emoji} ${opt.label}`}
                >
                  <span className="mr-1.5">{opt.emoji}</span>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            카드의 말투와 분위기를 정해요.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={ids.highlight}>핵심 키워드</Label>
        <Input
          id={ids.highlight}
          value={value.highlight}
          onChange={(e) => update("highlight", e.target.value)}
          placeholder="예) 갓 구운 베이글, 어린이날 한정 세트"
          maxLength={60}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={ids.detail}>상세 설명 (선택)</Label>
        <Textarea
          id={ids.detail}
          value={value.detail}
          onChange={(e) => update("detail", e.target.value)}
          placeholder="가게 특징, 사장님이 꼭 알리고 싶은 한 줄을 적어주세요."
          maxLength={200}
          rows={3}
        />
        <p className="text-right text-xs text-muted-foreground">
          {value.detail.length}/200
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={ids.price}>가격 / 기간 띠 (선택)</Label>
          <Input
            id={ids.price}
            value={value.priceText || ""}
            onChange={(e) => update("priceText", e.target.value)}
            placeholder="예) 9,800원, 5월 한정"
            maxLength={40}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={ids.cta}>CTA 한 줄 (선택)</Label>
          <Input
            id={ids.cta}
            value={value.ctaText || ""}
            onChange={(e) => update("ctaText", e.target.value)}
            placeholder="예) DM으로 예약하기"
            maxLength={40}
          />
        </div>
      </div>
    </div>
  );
}
