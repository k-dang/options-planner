<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a single Next.js 16 app (`options-planner`) using **Bun** as the package manager. Standard scripts live in `package.json` (`dev`, `build`, `lint` = `biome check`, `typecheck` = `tsc --noEmit`, `test` = `vitest run`, `db:migrate`). Run everything with `bun run <script>`.

- **Database**: The app talks to Postgres via `drizzle-orm/neon-http` (`src/db/client.ts`), so the database is a remote **Neon** endpoint reached over HTTPS — there is no local DB process to start. The connection comes from the `DATABASE_URL` secret, injected as an env var into shells. The Neon `-pooler` host works fine with the HTTP driver.
- **Gotcha — `DATABASE_URL` must be in the dev server's env**: Start `bun run dev` from a normal shell so it inherits the injected `DATABASE_URL`. A pre-existing tmux/portal server may NOT have the secret, in which case the watchlist (and other DB-backed pages) fail with `DATABASE_URL is required for database access.` Do not "fix" this by adding a `.env.local` pointing elsewhere; the injected env var takes precedence over `.env.local` anyway.
- **Migrations**: Run `bun run db:migrate` once before first use (idempotent). It applies the SQL in `drizzle/` into the `options_planner` Postgres schema.
- **Options-chain data is mocked by default**: `getOptionChainProvider()` returns a deterministic generated provider unless `OPTION_CHAIN_PROVIDER=alpaca` (which then also requires `ALPACA_API_KEY` / `ALPACA_API_SECRET`). The app, scanner, and builder are fully usable end-to-end without Alpaca.
- **Tests** mock the DB (`vi.mock("@/db", ...)`), so `bun run test` needs no database or network.
- The durable position-refresh workflow runs **inside** the Next.js server (Vercel `workflow` SDK via `withWorkflow` in `next.config.ts`); it is not a separate service.
