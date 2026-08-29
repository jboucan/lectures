import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the build use relative asset paths, so it works whether
// you deploy to a domain root (Vercel) or a subpath like
// https://username.github.io/lectures/ (GitHub Pages).
export default defineConfig({
  plugins: [react()],
  base: './',
})
