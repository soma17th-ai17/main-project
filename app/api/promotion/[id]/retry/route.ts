import { NextResponse } from "next/server";
import { createGeneratedContent } from "@/lib/generator";
import { promotionStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = promotionStore.get(id);

  if (!existing) {
    return NextResponse.json({ error: "재생성할 결과를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await request.json()) as { feedback?: string };
  const generated = await createGeneratedContent({
    ...existing.request,
    feedback: body.feedback ?? ""
  });
  promotionStore.set(generated.id, generated);
  return NextResponse.json(generated);
}
