import { test, expect } from "@playwright/test";

test("landing CTA opens the studio wizard", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /사진 한 장이면/ }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /사진으로 홍보물 만들기/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/studio$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /홍보할 사진을 올려주세요/ }),
  ).toBeVisible();
  await expect(page.getByText(/사진을 1장 이상 올려주세요/)).toBeVisible();
});

test("API health and card generation respond", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  const healthBody = await health.json();
  expect(healthBody.imageProvider).toBe("mock");

  const gen = await request.post("/api/cards/generate", {
    data: {
      brief: {
        storeName: "행복국밥",
        category: "음식점",
        purpose: "new-menu",
        tone: "warm",
        highlight: "점심 든든한 국밥",
        detail: "정성 가득한 한 끼 준비했어요",
        priceText: "9,000원",
        ctaText: "DM 으로 예약하기",
      },
      photoIds: [],
      count: 4,
    },
  });
  expect(gen.ok()).toBeTruthy();
  const body = await gen.json();
  expect(body.ok).toBe(true);
  expect(body.result.cards).toHaveLength(4);
  expect(body.result.cards[0].copy.headline).toBeTruthy();
});
