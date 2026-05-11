import { copyFileSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import dts from "bun-plugin-dts";
import chalk from "chalk";

// Clean dist directory
rmSync("./dist", { recursive: true, force: true });
mkdirSync("./dist", { recursive: true });

const common_settings: Omit<Bun.BuildConfig, "entrypoints" | "outdir" | "naming"> = {
  format: "esm",
  minify: true,
  define: {},
};

const cjs_settings: Omit<Bun.BuildConfig, "entrypoints" | "outdir" | "naming"> = {
  format: "cjs",
  minify: true,
  define: {},
};

// Build worker and client in parallel
const builds = await Promise.all([
  Bun.build({
    entrypoints: ["./index.ts"],
    outdir: "./dist",
    plugins: [dts()],
    external: [],
    ...common_settings,
  }),
  Bun.build({
    entrypoints: ["./index.ts"],
    outdir: "./dist/cjs",
    plugins: [dts()],
    external: [],
    ...cjs_settings,
  }),
  Bun.build({
    entrypoints: ["./lib/testing/index.ts"],
    outdir: "./dist/testing",
    plugins: [dts()],
    external: [],
    ...common_settings,
  }),
  Bun.build({
    entrypoints: ["./lib/testing/index.ts"],
    outdir: "./dist/cjs/testing",
    plugins: [dts()],
    external: [],
    ...cjs_settings,
  }),
]);

for (const build of builds) {
  if (!build.success) {
    console.error("Build failed:");

    for (const log of build.logs) {
      console.error(log);
    }

    process.exit(1);
  }
}

const dir = readdirSync("./dist");

renameSync("./dist/cjs/index.js", "./dist/cjs/index.cjs");
renameSync("./dist/cjs/testing/index.js", "./dist/cjs/testing/index.cjs");
copyFileSync("./dist/cjs/index.d.ts", "./dist/cjs/index.d.cts");
copyFileSync("./dist/cjs/testing/index.d.ts", "./dist/cjs/testing/index.d.cts");

console.log(chalk.bgBlueBright("  Build complete:  "));
dir.forEach((file) => {
  const fileSize = statSync(`./dist/${file}`);
  console.log(
    `   [${chalk.yellow("Write")}] ${chalk.blue(`dist/${file}`)} [${chalk.magentaBright(`${(fileSize.size / 1024).toFixed(2)}kb`)}]`,
  );
});
