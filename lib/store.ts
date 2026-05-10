import type { GeneratedContent } from "./types";

const globalForStore = globalThis as typeof globalThis & {
  promotionStore?: Map<string, GeneratedContent>;
};

export const promotionStore = globalForStore.promotionStore ?? new Map<string, GeneratedContent>();

if (!globalForStore.promotionStore) {
  globalForStore.promotionStore = promotionStore;
}
