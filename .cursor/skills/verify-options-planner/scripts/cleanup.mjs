#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import {
  artifactsDir,
  instancePath,
  logPath,
  pidAlive,
  readInstance,
} from "./_lib.mjs";

const instance = readInstance();

function killPid(pid) {
  if (!pid || !pidAlive(pid)) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already gone
  }
}

function tryRm(path) {
  try {
    rmSync(path, { force: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EPERM"
    ) {
      console.error(`Could not remove ${path}. A process still has it open.`);
      return;
    }
    throw error;
  }
}

if (instance?.pid) {
  killPid(instance.pid);
}

tryRm(instancePath);
tryRm(logPath);
tryRm(`${logPath}.err`);

console.log(
  JSON.stringify(
    {
      ok: true,
      killedPid: instance?.pid ?? null,
      artifactsKept: artifactsDir,
    },
    null,
    2,
  ),
);
