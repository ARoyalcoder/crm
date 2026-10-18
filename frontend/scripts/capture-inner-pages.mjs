import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const SIZES = [
  { name: 'laptop-1366x650', width: 1366, height: 650 }, // typical 1366x768 screen minus browser UI
  { name: 'laptop-1280x620', width: 1280, height: 620 }, // 1280x720 / scaled minus browser UI
]

const outDir = path.resolve('../screenshots')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

async function run() {
  const browser = await chromium.launch({ headless: true })
  
  for (const size of SIZES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height }
    })
    const page = await context.newPage()
    
    // Login
    await page.goto('http://localhost:5173/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Email').fill('superadmin@pawanputra.com')
    await page.getByLabel('Password').fill('Password@123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    await page.waitForURL('http://localhost:5173/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(outDir, `dash-${size.name}.png`) })
    
    // Customers
    await page.goto('http://localhost:5173/customers')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, `customers-${size.name}.png`) })

    // Leads
    await page.goto('http://localhost:5173/leads')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, `leads-${size.name}.png`) })

    // Projects
    await page.goto('http://localhost:5173/projects')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, `projects-${size.name}.png`) })

    // Invoices
    await page.goto('http://localhost:5173/invoices')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, `invoices-${size.name}.png`) })
    
    await context.close()
  }
  
  await browser.close()
  console.log('Finished capturing app pages.')
}

run().catch(console.error)
