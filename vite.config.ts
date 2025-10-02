import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: "dist",
      rollupTypes: true,
      strictOutput: true,
    }),
  ],
  build: {
    target: "node20",
    outDir: "dist",
    lib: {
      entry: "src/server.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "@modelcontextprotocol/sdk",
        "playwright",
        "fs-extra",
        "mime-types",
        "pixelmatch",
        "pngjs",
        "dotenv",
        // Node.js built-in modules that should be external
        "node:process",
        "node:events",
        "node:stream",
        "node:util",
        "node:buffer",
        "node:path",
        "node:fs",
        "node:crypto",
      ],
      output: {
        format: "es",
      },
    },
    sourcemap: true,
    minify: false,
    // Ensure Node.js APIs are available
    commonjsOptions: {
      include: [/node_modules/, /src/],
    },
  },
  resolve: {
    conditions: ["node"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tools": path.resolve(__dirname, "./src/tools"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },
  optimizeDeps: {
    include: ["@modelcontextprotocol/sdk"],
    exclude: ["@modelcontextprotocol/sdk/server/stdio.js"],
  },
  define: {
    global: "globalThis",
  },
  // Ensure Node.js environment
  esbuild: {
    platform: "node",
  },
  // Add Node.js polyfills if needed
  ssr: {
    noExternal: ["@modelcontextprotocol/sdk"],
  },
});
