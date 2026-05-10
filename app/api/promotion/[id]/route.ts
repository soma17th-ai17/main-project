import { NextResponse } from "next/server";
import { promotionStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const generated = promotionStore.get(id);

  if (!generated) {
    return NextResponse.json({ error: "생성 결과를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(generated);
}
