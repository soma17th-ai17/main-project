// Pipeline-wide timestamped logger.
// Format: [ISO] [pipeline] stage=X status=Y job=<id> key=value ...
//
// One line per event so it grep-trivially against Vercel function logs.
// Keep value formatting cheap — strings only, no JSON serialization of large
// blobs. Detail fields are truncated by callers before they reach here.

type Status =
  | "accepted"
  | "start"
  | "retry"
  | "done"
  | "fail"
  | "skip"
  | "cancel";

type Fields = Record<string, string | number | boolean | undefined>;

export type Stage =
  | "request"
  | "copy"
  | "image"
  | "verify"
  | "fallback"
  | "result";

function formatValue(v: string | number | boolean | undefined): string {
  if (v === undefined || v === null) return "-";
  if (typeof v === "string") {
    if (v.length === 0) return "-";
    if (/\s|"/.test(v)) return `"${v.replace(/"/g, '\\"')}"`;
    return v;
  }
  return String(v);
}

export function pipelineLog(
  stage: Stage,
  status: Status,
  jobId: string | undefined,
  fields: Fields = {},
) {
  const ts = new Date().toISOString();
  const head = `[${ts}] [pipeline] stage=${stage} status=${status} job=${jobId ?? "-"}`;
  const tail = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${formatValue(v)}`)
    .join(" ");
  const line = tail ? `${head} ${tail}` : head;
  if (status === "fail") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function nowMs(): number {
  return Date.now();
}

export function elapsedMs(startMs: number): number {
  return Date.now() - startMs;
}
