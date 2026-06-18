import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // react-draggable(react-rnd 내부)이 참조하는 process 토큰 치환.
  // 미정의 시 브라우저에서 "process is not defined" 로 Rnd 편집이 깨진다.
  define: {
    "process.env.DRAGGABLE_DEBUG": "false",
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
