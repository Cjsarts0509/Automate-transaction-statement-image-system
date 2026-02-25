import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 깃허브 레포지토리 이름을 base에 반드시 설정해야 합니다. (앞뒤 슬래시 필수)
  base: '/Contract-Creation-System/', 
})