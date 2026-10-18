import { expect, test, type Page } from '@playwright/test'
import { installFixtureApi } from '../e2e-text/fixture-hook'
import { discoverPermissions } from '../e2e-text/routes'

/**
 * The project Tasks tab says each thing once: the status is the dropdown (not also a badge), the default priority
 * and everything about finished work is left off, an empty checklist is one small link, and the tab counts do not
 * repeat as a heading or show "(0)".
 *
 * Runs against sample data built from the app's own API schemas (see e2e-text/fixture-hook.ts), with the tasks
 * replaced by the three cases below. No backend is used.
 */

const LONG_PHASE = 'Phase 1: Retail Outlets Audit & Site Assessment'

async function openTasks(page: Page, { canUpdate = true } = {}) {
  // Nothing may reach a developer's real backend through the dev proxy.
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 200, json: {} }))
  await installFixtureApi(page, { permissions: discoverPermissions().filter((p) => canUpdate || p !== 'PROJECT_UPDATE') })
  await page.addInitScript((phase) => {
    const g = globalThis as unknown as { __QA_API__: (p: string, s: unknown, o: unknown) => Promise<Record<string, unknown>> }
    const base = g.__QA_API__
    g.__QA_API__ = async (path, schema, options) => {
      const res = await base(path, schema, options)
      if (/\/projects\/[^/?]+$/.test(String(path).split('?')[0]) && Array.isArray(res.tasks)) {
        const t = res.tasks as Record<string, unknown>[]
        const bare = { dependencies: [], checklists: [], description: null, actualHours: null, completedAt: null, startDate: null }
        res.members = []
        res.deliverables = []
        res.tasks = [
          { ...t[0], ...bare, title: 'Survey the stores', priority: 'HIGH', status: 'BLOCKED', milestoneTitle: phase, assignedToName: 'Ramesh Yadav', dueDate: '2020-01-01', estimatedHours: 16 },
          { ...t[1], ...bare, title: 'Write the handover note', priority: 'MEDIUM', status: 'TODO', milestoneTitle: null, assignedToName: null, dueDate: null, estimatedHours: null },
          { ...t[2], ...bare, title: 'Mount the cameras', priority: 'CRITICAL', status: 'COMPLETED', milestoneTitle: null, assignedToName: 'Ramesh Yadav', dueDate: '2020-01-02', estimatedHours: 24 },
        ]
      }
      return res
    }
  }, LONG_PHASE)
  await page.goto('/projects/70000000-0000-4000-8000-000000000001?tab=tasks')
  await expect(page.getByRole('heading', { name: 'Survey the stores' })).toBeVisible()
}

const card = (page: Page, title: string) => page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) })

test('an open task shows its status once, what matters about it, and nothing else', async ({ page }) => {
  await openTasks(page)
  const open = card(page, 'Survey the stores')

  await expect(open.getByLabel('Status of Survey the stores')).toBeVisible()
  await expect(open.getByText('Blocked', { exact: true }), 'the status is the dropdown, not also a badge').toHaveCount(1)
  await expect(open.getByText('High', { exact: true })).toBeVisible()
  await expect(open).toContainText('days late')
  await expect(open.getByTitle(LONG_PHASE), 'a long phase name is cut off but readable on hover').toBeVisible()
  await expect(open).toContainText('16 h')
  await expect(open).not.toContainText('estimated')
})

test('the default priority is not repeated on every task', async ({ page }) => {
  await openTasks(page)
  const normal = card(page, 'Write the handover note')

  await expect(normal.getByText('Medium')).toHaveCount(0)
  await expect(normal).toContainText('Unassigned')
})

test('finished work shows no priority, no due date and no checklist link', async ({ page }) => {
  await openTasks(page)
  const done = card(page, 'Mount the cameras')

  await expect(done.getByText('Critical')).toHaveCount(0)
  await expect(done.getByText(/^Due /)).toHaveCount(0)
  await expect(done.getByRole('button', { name: 'Checklist' })).toHaveCount(0)
  await expect(done).toContainText('24 h')
})

test('an empty checklist is one small link that opens the new-item box, and closes again', async ({ page }) => {
  await openTasks(page)
  const open = card(page, 'Survey the stores')
  await expect(open.getByText('Checklist (')).toHaveCount(0)

  await open.getByRole('button', { name: 'Checklist' }).click()
  const input = open.getByLabel('New checklist item')
  await expect(input).toBeVisible()
  await expect(open.getByRole('button', { name: 'Checklist' })).toHaveCount(0)

  await input.press('Escape')
  await expect(input).toHaveCount(0)
  await expect(open.getByRole('button', { name: 'Checklist' })).toBeVisible()
})

test('tab counts appear only when there is something to count, and are not repeated as a heading', async ({ page }) => {
  await openTasks(page)

  await expect(page.getByRole('tab', { name: 'Tasks (3)' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Deliverables', exact: true }), 'no "(0)"').toBeVisible()
  await expect(page.getByRole('tab', { name: 'Team', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Tasks \(/ })).toHaveCount(0)
})

test('someone who cannot edit still sees each status, but no controls', async ({ page }) => {
  await openTasks(page, { canUpdate: false })
  const open = card(page, 'Survey the stores')

  await expect(open.getByText('Blocked', { exact: true }), 'the badge stands in for the missing dropdown').toBeVisible()
  await expect(open.getByLabel('Status of Survey the stores')).toHaveCount(0)
  await expect(open.getByRole('button', { name: 'Checklist' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add task' })).toHaveCount(0)
})
