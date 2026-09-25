import { test, expect } from '@playwright/test'

test('WebGL、连续滚动、五幕导航与档案弹窗', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await expect(page.locator('.universe')).toHaveClass(/is-ready/)
  await expect(page.locator('.universe')).not.toHaveClass(/is-fallback/)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1400)
  await page.screenshot({ path: testInfo.outputPath('01-observe.png') })
  for (const [index, name] of ['arrival', 'terrain', 'shadow', 'intelligence', 'horizon'].entries()) {
    await page.locator('[data-nav]').nth(index).click()
    await expect(page.locator('html')).toHaveAttribute('data-chapter', String(index))
    await expect.poll(async () => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo(index / 4, 2)
    await expect(page.locator(`.chapter[data-chapter="${index}"]`)).toHaveAttribute('aria-hidden', 'false')
    await page.screenshot({ path: testInfo.outputPath(`chapter-${name}.png`) })
  }
  // Verify a position between chapter anchors exists instead of snapping.
  await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.37))
  await expect.poll(async () => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--journey')))).toBeCloseTo(0.37, 2)
  await page.getByRole('button', { name: '任务档案' }).click()
  await expect(page.locator('dialog')).toBeVisible()
  await expect(page.locator('dialog a')).toHaveCount(3)
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('footer')).toContainText('Image credit: NASA')
  expect(errors).toEqual([])
})

test('手机构图与减少动态效果', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.universe')).toHaveClass(/is-ready/)
  await page.evaluate(() => document.fonts.ready)
  for (const index of [0, 2, 3, 4]) {
    await page.locator('[data-nav]').nth(index).click()
    await expect(page.locator('html')).toHaveAttribute('data-chapter', `${index}`)
    await page.screenshot({ path: testInfo.outputPath(`mobile-${index}.png`) })
    const bounds = await page.locator(`.chapter[data-chapter="${index}"] h1, .chapter[data-chapter="${index}"] h2`).boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('WebGL不可用时仍能阅读和导航', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null
      return original.apply(this, [type, ...args] as Parameters<typeof original>)
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('.universe')).toHaveClass(/is-fallback/)
  await page.locator('[data-nav]').nth(4).click()
  await expect(page.locator('html')).toHaveAttribute('data-chapter', '4')
  await expect(page.getByRole('link', { name: '探索开放模型' })).toBeVisible()
})
