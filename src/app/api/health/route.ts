import { NextResponse } from "next/server";
import { isSolarConfigured } from "@/lib/solar";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    solarConfigured: isSolarConfigured(),
    imageProvider: "mock",
    service: "bossmate",
  });
}
