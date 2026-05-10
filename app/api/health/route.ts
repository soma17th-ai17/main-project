import { NextResponse } from "next/server";
import { isSolarConfigured } from "@/lib/solar";

export function GET() {
  return NextResponse.json({
    ok: true,
    solarConfigured: isSolarConfigured(),
    imageProvider: "mock"
  });
}
