import { NextResponse, after } from "next/server";
import { z } from "zod";
import { runPromotionJob } from "@/lib/generator";
import { setJob } from "@/lib/store";
import type { JobRecord, PromotionRequest } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const purposeEnum = z.enum([
  "new-menu",
  "event",
  "daily",
  "reopening",
  "review",
]);

const platformEnum = z.enum(["instagram", "naver", "baemin"]);

const requestSchema = z.object({
  store: z.object({
    storeName: z.string().trim().min(1, "상호명을 입력해주세요."),
    category: z.string().trim().min(1, "업종을 입력해주세요."),
    vibe: z.string().trim().min(1, "분위기/톤을 입력해주세요."),
    description: z.string().trim().optional(),
  }),
  purpose: purposeEnum,
  detail: z.string().trim().min(1, "홍보 상세 내용을 입력해주세요."),
  platform: platformEnum.optional(),
  feedback: z.string().trim().optional(),
});

export async function POST(request: Request) {
  let body: PromotionRequest;
  try {
    body = requestSchema.parse(await request.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((i) => i.message).join(" / ")
        : "요청 형식이 올바르지 않습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const job: JobRecord = {
    id,
    status: "pending",
    request: body,
    agentTrace: [],
    startedAt: now,
    updatedAt: now,
  };
  await setJob(job);

  after(async () => {
    await runPromotionJob(id, body);
  });

  return NextResponse.json({ id, status: job.status }, { status: 202 });
}
