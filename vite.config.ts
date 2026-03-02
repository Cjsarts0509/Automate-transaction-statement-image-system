import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. 테일윈드 플러그인 불러오기 추가

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 2. 플러그인 목록에 테일윈드 추가
  ],
  base: '/Automate-transaction-statement-image-system/', 
})
