import { expect, test, type Page } from '@playwright/test'
import { installFixtureApi } from '../e2e-text/fixture-hook'
import { discoverPermissions } from '../e2e-text/routes'

/**
 * Changes on the project page show at once. The server here is deliberately slow (1.5 s per request, like a distant
 * database): the screen must still change within a fraction of a second, settle on what the server confirms, and go
 * back (with the reason) if the server refuses.
 *
 * A small stateful fake server sits on top of sample data built from the app's own schemas; no backend is used.
 */

const SERVER_DELAY_MS = 1500
/** "At once" - well under the time the server needs. */
const INSTANT_MS = 500

async function openTasks(page: Page, { refuse = false } = {}) {
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 200, json: {} }))
  await installFixtureApi(page, { permissions: discoverPermissions() })
  await page.addInitScript(
    ({ delay, refuseChange }) => {
      type Item = { id: string; itemText: string; completed: boolean; displayOrder: number; completedAt: null; completedBy: null }
      type Task = Record<string, unknown> & { id: string; status: string; checklists: Item[] }
      const g = globalThis as unknown as {
        __QA_API__: (p: string, s: unknown, o: { method?: string; body?: { status?: string; completed?: boolean } }) => Promise<Record<string, unknown>>
        __slow: boolean
        __calls: string[]
      }
      g.__slow = false
      g.__calls = []
      const base = g.__QA_API__
      const wait = () => new Promise((resolve) => setTimeout(resolve, g.__slow ? delay : 0))
      let tasks: Task[] | null = null
      const progress = () => (tasks && tasks.length ? Math.round((tasks.filter((t) => t.status === 'COMPLETED').length / tasks.length) * 100) : 0)

      g.__QA_API__ = async (path, schema, options) => {
        const clean = String(path).split('?')[0].replace(/^\/api\/v1/, '')
        const res = await base(path, schema, options)
        const detail = /^\/projects\/[^/]+$/.test(clean) && Array.isArray(res.tasks)
        const status = /^\/projects\/[^/]+\/tasks\/([^/]+)\/status$/.exec(clean)
        const toggle = /^\/projects\/[^/]+\/tasks\/([^/]+)\/checklists\/([^/]+)\/toggle$/.exec(clean)

        if (detail) {
          g.__calls.push('GET project')
          if (!tasks) {
            const [a, b] = res.tasks as Task[]
            const item: Item = { id: 'item-1', itemText: 'Confirm camera count', completed: false, displayOrder: 1, completedAt: null, completedBy: null }
            tasks = [
              { ...a, title: 'Survey the stores', status: 'BLOCKED', priority: 'MEDIUM', checklists: [], dependencies: [] },
              { ...b, title: 'Mount the cameras', status: 'TODO', priority: 'MEDIUM', checklists: [item], dependencies: [] },
            ]
          }
          await wait()
          return { ...res, id: clean.split('/').pop(), progressPercentage: progress(), tasks: JSON.parse(JSON.stringify(tasks)) }
        }
        if (status) {
          g.__calls.push(`PATCH status ${options.body?.status}`)
          await wait()
          if (refuseChange) throw new Error('The server refused this change')
          const task = tasks?.find((t) => t.id === status[1])
          if (task) task.status = String(options.body?.status)
          return { ...(task as object) }
        }
        if (toggle) {
          g.__calls.push(`PATCH checklist ${options.body?.completed}`)
          await wait()
          const item = tasks?.flatMap((t) => t.checklists).find((i) => i.id === toggle[2])
          if (item) item.completed = Boolean(options.body?.completed)
          return { ...(item as object) }
        }
        return res
      }
    },
    { delay: SERVER_DELAY_MS, refuseChange: refuse },
  )
  await page.goto('/projects/70000000-0000-4000-8000-000000000001?tab=tasks')
  await expect(page.getByRole('heading', { name: 'Survey the stores' })).toBeVisible()
  // From here on the "server" is slow.
  await page.evaluate(() => {
    ;(globalThis as unknown as { __slow: boolean }).__slow = true
  })
}

const calls = (page: Page) => page.evaluate(() => (globalThis as unknown as { __calls: string[] }).__calls)

test('a new task status shows at once, even though the server takes 1.5 s, and stays once confirmed', async ({ page }) => {
  await openTasks(page)
  const status = page.getByLabel('Status of Survey the stores')
  await expect(status).toContainText('Blocked')
  await expect(page.getByText(/· 0 of 2 tasks/)).toBeVisible()

  await status.click()
  await page.getByRole('option', { name: 'Completed' }).click()

  // Instant: the dropdown, and the progress figure that depends on it.
  await expect(status).toContainText('Completed', { timeout: INSTANT_MS })
  await expect(page.getByText(/· 1 of 2 tasks/)).toBeVisible({ timeout: INSTANT_MS })

  // Then the server confirms, the page re-reads the project, and nothing flickers back.
  await expect.poll(() => calls(page), { timeout: 8_000 }).toEqual(expect.arrayContaining(['PATCH status COMPLETED']))
  await expect.poll(async () => (await calls(page)).filter((c) => c === 'GET project').length, { timeout: 8_000 }).toBeGreaterThanOrEqual(2)
  await expect(status).toContainText('Completed')
  await expect(page.getByText(/· 1 of 2 tasks/)).toBeVisible()
})

test('a change the server refuses is put back, with the reason', async ({ page }) => {
  await openTasks(page, { refuse: true })
  const status = page.getByLabel('Status of Survey the stores')

  await status.click()
  await page.getByRole('option', { name: 'Completed' }).click()
  await expect(status).toContainText('Completed', { timeout: INSTANT_MS })

  // The server says no: the screen returns to what it was and explains why.
  await expect(status).toContainText('Blocked', { timeout: 6_000 })
  await expect(page.getByText(/· 0 of 2 tasks/)).toBeVisible()
  const alert = page.getByRole('alert').filter({ hasText: 'The task could not be updated' })
  await expect(alert).toContainText('The server refused this change')
})

test('ticking a checklist item shows at once', async ({ page }) => {
  await openTasks(page)
  const box = page.getByRole('checkbox', { name: 'Confirm camera count' })
  await expect(box).not.toBeChecked()

  await page.getByText('Confirm camera count', { exact: true }).click()

  await expect(box).toBeChecked({ timeout: INSTANT_MS })
  await expect(page.getByText('Checklist (1 of 1)')).toBeVisible({ timeout: INSTANT_MS })
  await expect.poll(() => calls(page), { timeout: 8_000 }).toEqual(expect.arrayContaining(['PATCH checklist true']))
  await expect(box).toBeChecked()
})
