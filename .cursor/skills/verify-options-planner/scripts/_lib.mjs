import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const skillDir = join(dirname(fileURLToPath(import.meta.url)), "..");
export const repoRoot = join(skillDir, "../../..");
export const runDir = join(skillDir, "run");
export const instancePath = join(runDir, "instance.json");
export const logPath = join(runDir, "next.log");
export const artifactsDir = join(skillDir, "artifacts");

export const DEFAULT_PORT = 3100;
export const DEFAULT_HOST = "127.0.0.1";

export function readInstance() {
  if (!existsSync(instancePath)) {
    return null;
  }

  return JSON.parse(readFileSync(instancePath, "utf8"));
}

export function instanceUrl(instance = readInstance()) {
  if (!instance) {
    return null;
  }

  return `http://${instance.host}:${instance.port}`;
}

export function pidAlive(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function listenerPid(port, host = DEFAULT_HOST) {
  if (process.platform === "win32") {
    const output = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
    const needle = `:${port}`;
    for (const line of output.split(/\r?\n/)) {
      if (!line.includes(needle) || !line.includes("LISTENING")) {
        continue;
      }
      if (
        host &&
        !line.includes(`${host}:${port}`) &&
        !line.includes(`0.0.0.0:${port}`)
      ) {
        continue;
      }
      const pid = Number(line.trim().split(/\s+/).at(-1));
      if (Number.isFinite(pid) && pid > 0) {
        return pid;
      }
    }
    return null;
  }

  try {
    const output = execFileSync(
      "lsof",
      ["-iTCP:" + port, "-sTCP:LISTEN", "-t"],
      { encoding: "utf8" },
    ).trim();
    const pid = Number(output.split(/\n/)[0]);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export async function fetchText(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}
