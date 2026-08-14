#!/usr/bin/env node

import {
  fetchText,
  instanceUrl,
  listenerPid,
  pidAlive,
  readInstance,
} from "./_lib.mjs";

function fail(message, extra = {}) {
  console.error(
    JSON.stringify({ ok: false, error: message, ...extra }, null, 2),
  );
  process.exit(1);
}

const instance = readInstance();
if (!instance) {
  fail(
    "No verify instance. Run scripts/launch.mjs first. Do not drive http://localhost:3000.",
  );
}

if (!pidAlive(instance.pid)) {
  const listening = listenerPid(instance.port, instance.host);
  if (!listening) {
    fail(
      "Verify pid is dead and nothing is listening on the recorded port. Run cleanup.mjs, then launch.mjs.",
      {
        pid: instance.pid,
        url: instance.url,
      },
    );
  }
  instance.pid = listening;
}

const url = instanceUrl(instance);
const home = await fetchText(url);
const optimize = await fetchText(`${url}/optimize?symbol=AAPL`);
const watchlist = await fetchText(`${url}/watchlist`);

const homeOk = home.ok && home.body.includes("Options Planner");
const optimizeOk = optimize.ok && optimize.body.includes("Strategy Optimizer");
const generatedHint =
  optimize.body.includes("generated") || optimize.body.includes("Generated");
const watchlistReachable = watchlist.ok && watchlist.body.includes("Watchlist");

if (!homeOk || !optimizeOk) {
  fail("HTTP checks failed. This instance is not worth driving.", {
    url,
    pid: instance.pid,
    home: { status: home.status, ok: homeOk },
    optimize: { status: optimize.status, ok: optimizeOk },
  });
}

const report = {
  ok: true,
  url,
  pid: instance.pid,
  port: instance.port,
  chainProvider: instance.chainProvider,
  generatedHint,
  mutationsAllowed: instance.mutationsAllowed === true,
  watchlistReachable,
  identity: "Options Planner",
};
console.log(JSON.stringify(report, null, 2));

if (!generatedHint) {
  console.error(
    "Warning: /optimize HTML did not mention generated chains. Confirm OPTION_CHAIN_PROVIDER was forced to generated at launch.",
  );
}

if (report.mutationsAllowed) {
  console.error(
    "Warning: OPTIONS_PLANNER_VERIFY_MUTATIONS=1. Add/remove watchlist symbols and save/close/delete positions will hit DATABASE_URL from the process env. Only continue on a disposable database.",
  );
}
