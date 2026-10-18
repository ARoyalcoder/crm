import { expect, test, type Page } from '@playwright/test'
import { mockSignedIn, mockSignedOut, mockSystemInfo } from './support'

/**
 * Changing the theme is one smooth animation: the new colours spread out in a circle from the control
 * that was clicked (a soft fade when the operating system switched), with a colour-fade fallback where
 * the browser has no View Transitions, and no animation for people who ask for reduced motion.
 *
 * These tests freeze the animation half way and read real screenshot pixels, so they prove what a
 * person would see, not just that some code ran.
 */

declare global {
  interface Window {
    __vt: { calls: number; darkAtUpdate: boolean | null; darkAfterUpdate: boolean | null; transitionAtUpdate: string | null }
  }
}

test.beforeEach(async ({ page }) => {
  // Nothing in this file needs the API, and nothing may reach a developer's real backend through the dev proxy.
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 200, json: {} }))
  await mockSignedIn(page)
  await mockSystemInfo(page)
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
})

/** Records every View Transition the page starts, and what the page looked like inside its callback. */
async function spyOnViewTransitions(page: Page) {
  await page.addInitScript(() => {
    window.__vt = { calls: 0, darkAtUpdate: null, darkAfterUpdate: null, transitionAtUpdate: null }
    const original = document.startViewTransition?.bind(document)
    if (!original) return
    document.startViewTransition = ((update?: () => void) => {
      window.__vt.calls++
      return original(() => {
        const root = document.documentElement
        window.__vt.darkAtUpdate = root.classList.contains('dark')
        // Any component that animates its colours (transition-colors) would spoil the "after" picture.
        const animated = document.querySelector('.transition-colors')
        window.__vt.transitionAtUpdate = animated ? getComputedStyle(animated).transitionDuration : null
        const result = update?.()
        window.__vt.darkAfterUpdate = root.classList.contains('dark')
        return result
      })
    }) as typeof document.startViewTransition
  })
}

async function openShell(page: Page) {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
}

async function chooseTheme(page: Page, name: 'Light' | 'Dark' | 'System') {
  await page.getByRole('button', { name: 'Change theme' }).click()
  await page.getByRole('menuitem', { name: name }).click()
}

const html = (page: Page) => page.locator('html')

/** Brightness (0-255) of single pixels of a PNG, read in a throw-away page so the page under test is untouched. */
async function brightness(sampler: Page, png: Buffer, points: { x: number; y: number }[]) {
  return sampler.evaluate(
    async ({ base64, spots }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      return spots.map(({ x, y }) => {
        const [r, g, b] = context.getImageData(Math.round(x), Math.round(y), 1, 1).data
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      })
    },
    { base64: png.toString('base64'), spots: points },
  )
}

test('dark spreads out from the toggle as a circle: bright far away, dark near it, dark everywhere at the end', async ({ page, context }) => {
  await spyOnViewTransitions(page)
  await openShell(page)
  const button = page.getByRole('button', { name: 'Change theme' })
  await expect(html(page)).not.toHaveClass(/dark/)

  await button.click()
  // Measured with the menu open, as the app does when a choice is made: an open menu locks page scrolling,
  // which can move things by a few pixels.
  // (A CSS locator: while a menu is open the rest of the page is hidden from role-based queries.)
  const box = (await page.locator('button[aria-label="Change theme"]').boundingBox())!
  const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.getByRole('menuitem', { name: 'Dark' }).click()

  // The browser is now playing the reveal. Freeze it part of the way through.
  const frozen = await page.waitForFunction(
    () => {
      const reveal = document
        .getAnimations()
        .find((a) => (a.effect as KeyframeEffect | null)?.pseudoElement === '::view-transition-new(root)')
      if (!reveal) return null
      reveal.pause()
      reveal.currentTime = 450 // of 1200 ms: the circle is well on its way
      const clip = getComputedStyle(document.documentElement, '::view-transition-new(root)').clipPath
      return /circle\(([\d.]+)px at ([\d.]+)px ([\d.]+)px\)/.exec(clip)?.slice(1).map(Number) ?? null
    },
    undefined,
    // Time-based rather than per frame: painting is suspended until the transition is ready.
    { polling: 50 },
  )
  const [radius, cx, cy] = (await frozen.jsonValue()) as number[]

  // The circle starts on the button, and it has grown but not yet covered the page.
  expect(Math.abs(cx - origin.x), 'circle starts at the toggle (x)').toBeLessThan(2)
  expect(Math.abs(cy - origin.y), 'circle starts at the toggle (y)').toBeLessThan(2)
  const viewport = page.viewportSize()!
  expect(radius, 'part way: already visible').toBeGreaterThan(40)
  expect(radius, 'part way: not finished').toBeLessThan(Math.hypot(viewport.width, viewport.height) - 100)

  const shot = await page.screenshot()
  const sampler = await context.newPage()
  const far = { x: Math.min(Math.max(cx - radius - 120, 5), viewport.width - 5), y: viewport.height - 10 }
  const [inside, outside] = await brightness(sampler, shot, [
    { x: Math.max(cx - radius * 0.5, 2), y: cy + 4 }, // inside the circle, left of the button
    { x: far.x, y: far.y }, // bottom of the page, well outside it
  ])
  expect(inside, `inside the circle is already dark (brightness ${inside})`).toBeLessThan(90)
  expect(outside, `outside the circle is still light (brightness ${outside})`).toBeGreaterThan(160)

  // The page was switched inside the transition callback, with every CSS colour transition off.
  const spy = await page.evaluate(() => window.__vt)
  expect(spy.calls).toBe(1)
  expect(spy.darkAtUpdate, 'still light when the transition started').toBe(false)
  expect(spy.darkAfterUpdate, 'dark by the time the callback returned (not later)').toBe(true)
  expect(spy.transitionAtUpdate, 'colour transitions are off while the pictures are taken').toBe('0s')

  // Let it finish: dark everywhere, remembered, and nothing left behind.
  await page.evaluate(() => document.getAnimations().forEach((a) => a.play()))
  await expect(html(page)).not.toHaveAttribute('data-theme-transition', /.+/)
  await expect(html(page)).toHaveClass(/dark/)
  expect(await page.evaluate(() => localStorage.getItem('pp-theme'))).toBe('dark')
  expect(await page.evaluate(() => document.documentElement.getAttribute('style') ?? '')).not.toContain('--theme-')
  const [corner] = await brightness(sampler, await page.screenshot(), [{ x: 6, y: viewport.height - 6 }])
  expect(corner, `the whole page is dark at the end (brightness ${corner})`).toBeLessThan(90)
})

test('going back to light also spreads out (it is not just a hard cut)', async ({ page }) => {
  await spyOnViewTransitions(page)
  await page.addInitScript(() => localStorage.setItem('pp-theme', 'dark'))
  await openShell(page)
  await expect(html(page)).toHaveClass(/dark/)

  await chooseTheme(page, 'Light')

  await expect.poll(() => page.evaluate(() => window.__vt.calls)).toBe(1)
  await expect(html(page)).not.toHaveClass(/dark/)
  await expect(html(page)).not.toHaveAttribute('data-theme-transition', /.+/)
  expect(await page.evaluate(() => localStorage.getItem('pp-theme'))).toBe('light')
})

test('the operating system switching to dark fades the page in (no origin to spread from)', async ({ page }) => {
  await spyOnViewTransitions(page)
  await openShell(page)
  await expect(html(page)).not.toHaveClass(/dark/)

  await page.emulateMedia({ colorScheme: 'dark' })

  await expect(html(page)).toHaveClass(/dark/)
  expect((await page.evaluate(() => window.__vt)).calls).toBe(1)
  await expect(html(page)).not.toHaveAttribute('data-theme-transition', /.+/)
})

test('people who ask for reduced motion get an instant change, with no animation at all', async ({ page }) => {
  await spyOnViewTransitions(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openShell(page)

  await chooseTheme(page, 'Dark')

  await expect(html(page)).toHaveClass(/dark/)
  const spy = await page.evaluate(() => window.__vt)
  expect(spy.calls, 'no view transition').toBe(0)
  await expect(html(page)).not.toHaveClass(/theme-transitioning/)
  await expect(html(page)).not.toHaveAttribute('data-theme-transition', /.+/)
})

test('browsers without View Transitions fade every colour with CSS, then clean up', async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-expect-error simulating an older browser
    delete Document.prototype.startViewTransition
  })
  await openShell(page)
  expect(await page.evaluate(() => 'startViewTransition' in document)).toBe(false)

  await chooseTheme(page, 'Dark')

  await expect(html(page)).toHaveClass(/dark/)
  await expect(html(page)).toHaveClass(/theme-transitioning/)
  const fade = await page.evaluate(() => getComputedStyle(document.querySelector('.transition-colors')!).transitionDuration)
  expect(fade, 'colours fade over 0.6 seconds').toMatch(/^0\.6s(, 0\.6s)*$/)
  await expect(html(page)).not.toHaveClass(/theme-transitioning/, { timeout: 3_000 })
})

test('choosing a theme twice in a row ends on the second choice, with no errors and nothing left over', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await spyOnViewTransitions(page)
  await openShell(page)

  await chooseTheme(page, 'Dark')
  await chooseTheme(page, 'Light')

  await expect(html(page)).not.toHaveClass(/dark/)
  await expect(html(page)).not.toHaveAttribute('data-theme-transition', /.+/, { timeout: 5_000 })
  expect(await page.evaluate(() => localStorage.getItem('pp-theme'))).toBe('light')
  expect(errors).toEqual([])
})

test('the sign-in page toggle plays the same animation', async ({ page }) => {
  // A new page object has no session: undo the signed-in mock from beforeEach.
  await mockSignedOut(page)
  await spyOnViewTransitions(page)
  await page.goto('/login')
  await expect(html(page)).not.toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Toggle theme mode' }).click()

  await expect(html(page)).toHaveClass(/dark/)
  expect((await page.evaluate(() => window.__vt)).calls).toBe(1)
  await expect(html(page)).not.toHaveAttribute('data-theme-transition', /.+/)
})
