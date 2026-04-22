import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const repoName = "quick-spark-exec";

export default defineConfig({
  vite: {
    base: process.env.GITHUB_ACTIONS ? `/${repoName}/` : "/",
  },
});
