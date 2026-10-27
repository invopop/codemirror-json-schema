import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      ignoreConfigErrors: true,
    }),
  ],
  build: {
    // esbuild 0.28+ no longer supports transforming certain destructuring
    // patterns when targeting legacy environments. Use esnext to skip the
    // post-bundle transpile step; the demo app is for development only.
    target: "esnext",
  },
  test: {
    maxConcurrency: 10,
    // configuration to be able to view console.log messages while debugging
    pool: "forks",
    disableConsoleIntercept: Boolean(process.env.CI),
  },
});
