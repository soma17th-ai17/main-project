import { NextResponse } from "next/server";
import { createGeneratedContent } from "@/lib/generator";
import { promotionStore } from "@/lib/store";
import type { PromotionRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

function validate(body: Partial<PromotionRequest>) {
  if (!body.store?.storeName || !body.store?.category || !body.store?.vibe || !body.purpose || !body.detail) {
    return "상호명, 업종, 분위기, 홍보 목적, 상세 내용을 모두 입력해주세요.";
  }
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<PromotionRequest>;
  const error = validate(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const generated = await createGeneratedContent(body as PromotionRequest);
  promotionStore.set(generated.id, generated);
  return NextResponse.json(generated);
}
