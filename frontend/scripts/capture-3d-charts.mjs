import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const artifactDir = 'C:/Users/PANKAJ SINGH/.gemini/antigravity/brain/77c8baa6-4560-4df1-8986-46e062ecaf55'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  try {
    // 1. Sign in
    await page.goto('http://localhost:5173/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Email').fill('superadmin@pawanputra.com')
    await page.getByLabel('Password').fill('Password@123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('http://localhost:5173/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // 2. Go to /analytics/finance
    await page.goto('http://localhost:5173/analytics/finance')
    await page.waitForLoadState('networkidle')
    await page.locator('text=Loading...').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1500)

    // Find the primary ChartCard
    const viewGroup = page.getByRole('group', { name: 'Invoiced and collected view' })
    const chartCard = page.locator('[data-slot="card"]').filter({ has: viewGroup }).first()
    await chartCard.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)

    // Capture Chart view with quick insights
    await chartCard.screenshot({ path: path.join(artifactDir, 'chart-2d-insights.png') })
    console.log('Captured Chart view with insights')

    // Switch to Table view
    const btnTable = viewGroup.getByRole('button', { name: 'Table' })
    await btnTable.click()
    await page.waitForTimeout(1000)
    await chartCard.screenshot({ path: path.join(artifactDir, 'chart-table-scrollbar.png') })
    console.log('Captured Table view with custom scrollbar')

    // 5. Invoices table page
    await page.goto('http://localhost:5173/invoices')
    await page.waitForLoadState('networkidle')
    await page.locator('text=Loading...').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(artifactDir, 'invoices-table-scrollbar.png'), fullPage: false })
    console.log('Captured Invoices table with custom scrollbar')

  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
  }
}

run()
