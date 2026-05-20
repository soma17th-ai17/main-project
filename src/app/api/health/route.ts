import { NextResponse } from "next/server";
import { isSolarConfigured } from "@/lib/solar";
import { isOpenAIImageConfigured } from "@/lib/image-gen";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    solarConfigured: isSolarConfigured(),
    imageProvider: isOpenAIImageConfigured() ? "openai" : "mock",
    service: "bossmate",
  });
}
