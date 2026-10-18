import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const SIZES = [
  { name: 'desktop-full', width: 1920, height: 1080 },
  { name: 'laptop-1366', width: 1366, height: 768 },
  { name: 'laptop-1280', width: 1280, height: 720 },
  { name: 'laptop-1440', width: 1440, height: 900 }
]

const outDir = path.resolve('screenshots')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

async function run() {
  const browser = await chromium.launch({ headless: true })
  
  for (const size of SIZES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height }
    })
    const page = await context.newPage()
    
    // 1. Login page
    await page.goto('http://localhost:5173/login')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: path.join(outDir, `login-${size.name}.png`) })
    
    // Check if login page causes vertical or horizontal scrolling
    const loginOverflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        hasVerticalScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight
      }
    })
    console.log(`Login [${size.name}]:`, loginOverflow)
    
    // 2. Perform login
    await page.getByLabel('Email').fill('superadmin@pawanputra.com')
    await page.getByLabel('Password').fill('Password@123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    await page.waitForURL('http://localhost:5173/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    await page.screenshot({ path: path.join(outDir, `dashboard-${size.name}.png`) })
    
    const dashOverflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        hasVerticalScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight
      }
    })
    console.log(`Dashboard [${size.name}]:`, dashOverflow)
    
    await context.close()
  }
  
  await browser.close()
}

run().catch(console.error)
