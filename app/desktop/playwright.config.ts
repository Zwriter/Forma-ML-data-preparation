import { defineConfig, devices } from '@playwright/test';

// Real-browser checks for layout, responsiveness, and keyboard flows that jsdom cannot measure.
// Runs against the demo build, so no Tauri runtime or Python engine is needed.
export default defineConfig({
  testDir: './tests/ui',
  testMatch: '**/*.pw.ts',
  fullyParallel: true,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174' },
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
