# Agent Notes

- Use the fff MCP tools for all file search operations instead of default tools.
- **Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

## Commands

- Use Bun; `bun.lock` is the lockfile and package scripts call Bun-specific APIs.
- Install deps with `bun install` if needed.
- Focused checks: `bun run typecheck`, `bun run lint`, `bun run fmt:check`, `bun test`.
- `bun test` currently reports `0 passed` because no test files are tracked.
- Build with `bun run build`; this runs `build.ts`, deletes/recreates `dist`, emits ESM plus declarations, then strips Bun's dynamic-require shim from `dist/index.js`.
- Publish uses `prepublishOnly: bun run build`; package output is only `dist` via `package.json#files`.

## Source Layout

- Public entrypoint is root `index.ts`; keep exported API changes there and verify `package.json#exports` still points to `dist/index.*`.
- Main implementation is `lib/logger.ts`; types are under `lib/types`, and sanitization helpers are under `lib/utils`.
- `dist/` is generated and ignored; do not hand-edit it.

## Tooling Quirks

- TypeScript is strict with `moduleResolution: "bundler"`, `module: "Preserve"`, `allowImportingTsExtensions`, and `noEmit`; build output comes from `Bun.build`, not `tsc`.
- Internal imports mix explicit `.ts` re-exports and extensionless imports; avoid changing import style unless the build and typecheck both pass.
- Formatting/linting are Ox tools: `oxfmt` and `oxlint`, not Prettier/ESLint.
- `bun-setup.ts` installs a `happy-dom` global browser environment but is not wired into `package.json` test scripts; only rely on it after adding explicit Bun test config or flags.

## Safety

- `.npmrc` is ignored and may contain an npm auth token; never add or commit it.

## Language

**Logging Span**:
A structured log event being accumulated around one unit of work before it is closed.
_Avoid_: Span log, trace span, OpenTelemetry span

**Closed Logging Span**:
The finalized result of closing a **Logging Span**, containing the **Log Payload** and severity level.
_Avoid_: Result, wrapper

**Log Payload**:
The structured data object sent to a logger or transport after a **Logging Span** is closed.
_Avoid_: Results, raw span

**Metric**:
A named value recorded on a **Logging Span** and included in its **Log Payload**.
_Avoid_: Field, attribute

## Relationships

- A **Logging Span** is closed to produce a **Closed Logging Span**.
- A **Logging Span** contains zero or more **Metrics**.
- A **Closed Logging Span** contains one **Log Payload**.

## Example Dialogue

> **Dev:** "Should this API call use a separate **Logging Span**?"
> **Domain expert:** "Yes, it is one unit of work with its own **Metrics** and duration."

## Flagged Ambiguities

- "spanning logs" was used to mean **Logging Span**.
- "field" and "attribute" are avoided in user-facing docs; the package calls named values **Metrics**.
