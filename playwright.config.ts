import { defineConfig } from '@playwright/test'

// The workstation may have a global HTTP proxy. Local preview probes must bypass it.
process.env.NO_PROXY = [process.env.NO_PROXY, '127.0.0.1', 'localhost'].filter(Boolean).join(',')

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 20000,
  },
})
