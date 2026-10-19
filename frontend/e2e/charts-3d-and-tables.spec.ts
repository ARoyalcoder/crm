import { expect, test } from '@playwright/test'
import { mockSignedIn, mockSystemInfo, mockVerticals } from './support'

const FINANCE_PERMS = ['ANALYTICS_VIEW', 'FINANCE_VIEW', 'FINANCE_MANAGE']

function mockFinanceDashboard() {
  return {
    period: {
      from: '2026-09-01',
      to: '2026-10-16',
      days: 46,
      previousFrom: '2026-07-17',
      previousTo: '2026-08-31',
      asOf: '2026-10-16',
      granularity: 'MONTH' as const,
      currency: 'INR',
    },
    overview: {
      invoiced: { value: 1200000, previous: 900000 },
      collected: { value: 1100000, previous: 850000 },
      outstanding: { amount: 100000, invoices: 2 },
      overdue: { amount: 150000, invoices: 2 },
      collectionRatePct: 91.6,
      trend: [
        { bucket: '2026-09-01', invoiced: 550000, collected: 480000 },
        { bucket: '2026-10-01', invoiced: 650000, collected: 620000 },
      ],
      byVertical: [
        { code: 'SOLAR', name: 'Solar', amount: 750000 },
        { code: 'IT_SUPPORT', name: 'IT Support', amount: 450000 },
      ],
      ageing: [
        { key: 'not_due', label: 'Not due', amount: 500000, invoices: 5 },
        { key: '1_30', label: '1-30 days', amount: 150000, invoices: 2 },
      ],
    },
    dsoDays: 24,
    topDebtors: [],
    collectedByMethod: [
      { method: 'UPI', payments: 14, amount: 700000 },
      { method: 'NEFT', payments: 6, amount: 400000 },
    ],
    projectEconomics: {
      projects: 8,
      revenue: 1500000,
      recordedCost: 900000,
      margin: 600000,
      marginPct: 40.0,
      material: 500000,
      labour: 400000,
      vendor: 0,
      travel: 0,
      other: 0,
      notItemised: 0,
      byVertical: [],
    },
  }
}

test.describe('Charts Quick Insights & Table Scrollbars', () => {
  test('charts render Quick Insights, 2D view, table view, and 3D option is removed', async ({ page }) => {
    await mockSignedIn(page, FINANCE_PERMS)
    await mockSystemInfo(page)
    await mockVerticals(page)

    await page.route('**/api/v1/analytics/finance*', (route) => route.fulfill({ json: mockFinanceDashboard() }))
    await page.route('**/api/v1/finance/settings*', (route) => route.fulfill({ json: { currency: 'INR' } }))

    await page.goto('/analytics/finance', { waitUntil: 'domcontentloaded' })

    // 1. Verify Peak and Total insight badges are removed from charts
    await expect(page.getByText(/Peak:/i)).toHaveCount(0)
    await expect(page.getByText(/Total:/i)).toHaveCount(0)

    // 2. Find ChartCard view toggle group
    const viewGroup = page.locator('[role="group"][aria-label*="view"]').first()
    await expect(viewGroup).toBeVisible()

    const btnChart = viewGroup.getByRole('button', { name: /Chart/i })
    const btnTable = viewGroup.getByRole('button', { name: /Table/i })
    const btn3D = viewGroup.getByRole('button', { name: /3D/i })

    // Verify Chart and Table buttons exist
    await expect(btnChart).toBeVisible()
    await expect(btnTable).toBeVisible()

    // Verify 3D option is removed
    await expect(btn3D).toHaveCount(0)

    // 3. Switch to Table View
    await btnTable.click()

    // Verify table container has table-scrollbar class
    const tableContainer = page.locator('.table-scrollbar').first()
    await expect(tableContainer).toBeVisible()

    // 4. Switch back to Chart View
    await btnChart.click()
    await expect(btnChart).toHaveAttribute('aria-pressed', 'true')
  })

  test('data tables across the application include custom table-scrollbar styling', async ({ page }) => {
    await mockSignedIn(page, FINANCE_PERMS)
    await mockSystemInfo(page)
    await mockVerticals(page)

    await page.route('**/api/v1/finance/ageing*', (route) =>
      route.fulfill({
        json: {
          asOf: '2026-10-10',
          buckets: [
            { label: 'Not due', fromDays: null, toDays: 0 },
            { label: '1-30 days', fromDays: 1, toDays: 30 },
            { label: '31-60 days', fromDays: 31, toDays: 60 },
            { label: '61-90 days', fromDays: 61, toDays: 90 },
            { label: 'Over 90 days', fromDays: 91, toDays: null },
          ],
          totals: [118000, 60000, 0, 0, 67000],
          total: 245000,
          overdue: 127000,
          customers: [
            { customerId: 'c1', customerName: 'Acme Solar', amounts: [118000, 60000, 0, 0, 0], total: 178000, oldestDaysOverdue: 20, invoices: 2 },
            { customerId: 'c2', customerName: 'Bright Interiors', amounts: [0, 0, 0, 0, 67000], total: 67000, oldestDaysOverdue: 131, invoices: 1 },
          ],
        },
      }),
    )

    await page.goto('/finance/ageing')

    // Verify the table container has table-scrollbar class
    const tableContainer = page.locator('[data-slot="table-container"]').first()
    await expect(tableContainer).toBeVisible()
    await expect(tableContainer).toHaveClass(/table-scrollbar/)
  })
})
