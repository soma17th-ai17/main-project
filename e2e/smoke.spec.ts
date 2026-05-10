import { expect, test } from '@playwright/test';

test('home page generates a promotion result', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.getByRole('heading', { name: '가게 정보 입력' })).toBeVisible();
  await page.getByRole('button', { name: '홍보물 생성' }).click();
  await expect(page.getByText(/Fallback 데모|Solar 생성/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: '이미지 다운로드' })).toBeVisible();
  await expect(page.locator('.visual-frame img')).toHaveAttribute('src', /data:image\/svg\+xml/);
});
