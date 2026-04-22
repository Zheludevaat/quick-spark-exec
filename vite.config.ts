import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const repoName = "quick-spark-exec";

export default defineConfig({
  vite: {
    base: process.env.GITHUB_ACTIONS ? `/${repoName}/` : "/",
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  },
});
