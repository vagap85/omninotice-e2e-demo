import * as dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.TARGET ?? 'dev'}` });

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
    projects: [
    // 1. Настройка авторизации (выполняется один раз)
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        baseURL: process.env.UI_BASE_URL ?? 'https://omni.skroy.ru', // <--- ВОТ ЭТО
      },
    },
    // 2. API-тесты
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL ?? 'https://vishenka.skroy.ru',
      },
    },
    // 3. UI-тесты
    {
      name: 'ui',
      testDir: './tests/ui',
      testMatch: /happy-path\.spec\.ts/, // <--- чтобы не запускать auth.setup.ts в этом проекте
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.UI_BASE_URL ?? 'https://omni.skroy.ru',
        viewport: { width: 1440, height: 900 },
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});