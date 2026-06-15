import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    // Чтобы работали алиасы @/ как в Next.js (tsconfig paths)
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
