import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/extension.ts"],
  external: ["vscode"],
  format: "cjs",
  outDir: "dist",
  outExtension({ format }) {
    return { js: format === "cjs" ? ".js" : ".mjs" };
  },
  sourcemap: true,
  target: "esnext",
});
