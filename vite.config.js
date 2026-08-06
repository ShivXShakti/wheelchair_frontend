import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': {
        target: 'https://localhost:8443',
        secure: false, // In case of self-signed certs
      },
      '/stop': {
        target: 'https://localhost:8443',
        secure: false,
      },
      '/generate': {
        target: 'https://localhost:8443',
        secure: false,
      },
      '/transcribe': {
        target: 'https://localhost:8443',
        secure: false,
      },
      '/teleop': {
        target: 'https://localhost:8443',
        secure: false,
      },
    }
  }
})
