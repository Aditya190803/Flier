import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/**/*.test.{ts,tsx}",
      "tests/**/*.spec.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "tests/**",
        "**/*.d.ts",
        "**/*.config.{ts,js,mjs}",
        "**/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
