import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    proxy: {
      // Proxy any request starting with /api to your backend on port 5001
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        // (optional) if you ever need to rewrite the path:
        // rewrite: (path) => path.replace(/^\/api/, "/api")
      },
    },
  },
  optimizeDeps: {
    include: ["d3-dag"],
  },
});
