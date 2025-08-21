import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use only the React plugin for Vite. Tailwind is handled via PostCSS config.
export default defineConfig({
  plugins: [react()],
})
