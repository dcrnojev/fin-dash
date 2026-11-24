import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths let the same build run at a site root or under a GitHub Pages project path; every page is index.html.
  base: './',
  // Google only accepts sign-in from the exact origins registered on the OAuth client, so the port must not drift.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
