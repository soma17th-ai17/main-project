import type { JobRecord } from "./types";

const globalForStore = globalThis as typeof globalThis & {
  promotionJobStore?: Map<string, JobRecord>;
};

export const promotionJobStore =
  globalForStore.promotionJobStore ?? new Map<string, JobRecord>();

if (!globalForStore.promotionJobStore) {
  globalForStore.promotionJobStore = promotionJobStore;
}

export function getJob(id: string): JobRecord | undefined {
  return promotionJobStore.get(id);
}

export function setJob(record: JobRecord): void {
  promotionJobStore.set(record.id, { ...record, updatedAt: new Date().toISOString() });
}

export function patchJob(id: string, patch: Partial<JobRecord>): JobRecord | undefined {
  const current = promotionJobStore.get(id);
  if (!current) return undefined;
  const next: JobRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  promotionJobStore.set(id, next);
  return next;
}
