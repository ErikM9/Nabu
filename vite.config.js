import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /* GitHub Pages serves the site under /Nabu/, which the deploy job passes in, while everything else runs at the root */
  base: process.env.BASE_PATH ?? '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
      thresholds: {
        lines: 90,
        functions: 80,
        statements: 90,
        branches: 85
      }
    }
  }
})