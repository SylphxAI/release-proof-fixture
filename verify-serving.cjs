const { readFileSync } = require("node:fs");
const { setTimeout: delay } = require("node:timers/promises");

async function observeServing(expected, {
  fetchHealth = (url) => fetch(url, { signal: AbortSignal.timeout(10_000) }),
  now = Date.now,
  sleep = delay,
  log = console.log,
} = {}) {
  const deadline = now() + 90 * 60_000;
  let firstSeen;
  while (now() < deadline) {
    try {
      const response = await fetchHealth(expected.url);
      const health = response.ok ? await response.json() : null;
      if (health?.version === expected.version
          && health.configuration === expected.configuration
          && health.secret_sha256 === expected.secretSha256) {
        firstSeen = now();
        log(JSON.stringify({ event: "candidate-serving", at: new Date(firstSeen).toISOString(), health }));
        break;
      }
    } catch (error) {
      log(JSON.stringify({ event: "waiting-for-candidate", error: error.message }));
    }
    await sleep(15_000);
  }
  if (firstSeen === undefined) {
    throw new Error("The expected public candidate did not serve within 90 minutes");
  }
  // The subsequent full source check happens after public exposure and the
  // five-minute analysis window. A newer source may serve during this wait:
  // this run still checks the immutable source that originally started it.
  const checkAt = firstSeen + 360_000;
  while (now() < checkAt) {
    await sleep(Math.min(15_000, checkAt - now()));
  }
  log(JSON.stringify({ event: "serving-window-complete", at: new Date(now()).toISOString(), firstSeen: new Date(firstSeen).toISOString() }));
  return { firstSeen, checkedAt: now() };
}

if (require.main === module) {
  const expected = JSON.parse(readFileSync("serving-check.json", "utf8"));
  expected.version = require("./source.cjs").version;
  observeServing(expected).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { observeServing };
