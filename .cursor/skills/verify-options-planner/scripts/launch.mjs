#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  artifactsDir,
  DEFAULT_HOST,
  DEFAULT_PORT,
  fetchText,
  instancePath,
  listenerPid,
  logPath,
  pidAlive,
  readInstance,
  repoRoot,
  runDir,
} from "./_lib.mjs";

const port = Number(process.env.OPTIONS_PLANNER_VERIFY_PORT || DEFAULT_PORT);
const host = process.env.OPTIONS_PLANNER_VERIFY_HOST || DEFAULT_HOST;
const url = `http://${host}:${port}`;
const distDir = ".next-verify";
const readyTimeoutMs = Number(
  process.env.OPTIONS_PLANNER_VERIFY_READY_MS || 120_000,
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function spawnDev() {
  const nextBin = join(repoRoot, "node_modules/next/dist/bin/next");
  const args = [nextBin, "dev", "--port", String(port), "-H", host];
  const env = {
    ...process.env,
    PORT: String(port),
    OPTION_CHAIN_PROVIDER: "generated",
    OPTIONS_PLANNER_DIST_DIR: distDir,
  };

  if (process.platform === "win32") {
    const child = spawn(
      "cmd.exe",
      ["/c", "start", "/b", process.execPath, ...args],
      {
        cwd: repoRoot,
        env,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      },
    );
    child.unref();
    return child.pid;
  }

  const logFd = openSync(logPath, "w");
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  if (child.pid == null) {
    fail("Failed to spawn next dev.");
  }
  child.unref();
  return child.pid;
}

const existing = readInstance();
if (existing && pidAlive(existing.pid) && existing.port === port) {
  const probe = await fetchText(`${url}/optimize?symbol=AAPL`);
  if (probe.ok && probe.body.includes("Strategy Optimizer")) {
    console.log(
      JSON.stringify(
        { ok: true, alreadyRunning: true, url, pid: existing.pid },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  fail(
    `instance.json pid ${existing.pid} is alive but ${url}/optimize is not ready. Run cleanup.mjs, then launch again.`,
  );
}

if (existing && pidAlive(existing.pid) && existing.port !== port) {
  fail(
    `A verify instance is already running on port ${existing.port} (pid ${existing.pid}). Run cleanup.mjs first.`,
  );
}

const occupied = await fetchText(url, { timeoutMs: 1500 }).catch(() => null);
if (occupied?.status) {
  const optimize = await fetchText(`${url}/optimize?symbol=AAPL`).catch(
    () => null,
  );
  if (optimize?.ok && optimize.body.includes("Strategy Optimizer")) {
    const listeningPid = listenerPid(port, host);
    const instance = {
      pid: listeningPid,
      port,
      host,
      url,
      distDir,
      chainProvider: "generated",
      startedAt: new Date().toISOString(),
      mutationsAllowed: process.env.OPTIONS_PLANNER_VERIFY_MUTATIONS === "1",
      adopted: true,
    };
    mkdirSync(runDir, { recursive: true });
    writeFileSync(instancePath, `${JSON.stringify(instance, null, 2)}\n`);
    console.log(
      JSON.stringify({ ok: true, alreadyRunning: true, ...instance }, null, 2),
    );
    process.exit(0);
  }

  fail(
    `Port ${port} is already taken by something that is not Strategy Optimizer. Set OPTIONS_PLANNER_VERIFY_PORT to a free port. Do not reuse the user's :3000 session.`,
  );
}

if (!existsSync(join(repoRoot, "node_modules", "next"))) {
  fail("node_modules/next is missing. From the repo root run: pnpm install");
}

mkdirSync(runDir, { recursive: true });
mkdirSync(artifactsDir, { recursive: true });

const pid = spawnDev();
const instance = {
  pid,
  port,
  host,
  url,
  distDir,
  chainProvider: "generated",
  startedAt: new Date().toISOString(),
  mutationsAllowed: process.env.OPTIONS_PLANNER_VERIFY_MUTATIONS === "1",
};
writeFileSync(instancePath, `${JSON.stringify(instance, null, 2)}\n`);

const deadline = Date.now() + readyTimeoutMs;
let lastError = "timed out waiting for /optimize";

while (Date.now() < deadline) {
  try {
    const home = await fetchText(url);
    const optimize = await fetchText(`${url}/optimize?symbol=AAPL`);
    if (
      home.ok &&
      home.body.includes("Options Planner") &&
      optimize.ok &&
      optimize.body.includes("Strategy Optimizer")
    ) {
      const listeningPid = listenerPid(port, host) ?? pid;
      instance.pid = listeningPid;
      writeFileSync(instancePath, `${JSON.stringify(instance, null, 2)}\n`);
      console.log(JSON.stringify({ ok: true, ...instance }, null, 2));
      process.exit(0);
    }

    lastError = `home=${home.status} optimize=${optimize.status}`;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
}

fail(
  `Dev server did not become ready at ${url} within ${readyTimeoutMs}ms. See ${logPath}. Last error: ${lastError}`,
);
