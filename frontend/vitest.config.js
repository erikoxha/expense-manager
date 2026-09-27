import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://127.0.0.1/api") },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.js"],
    include: ["src/tests/**/*.test.{js,jsx}"],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 85,
        branches: 80,
      },
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/main.jsx", "src/tests/**"],
    },
  },
});
