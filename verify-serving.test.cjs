const assert = require("node:assert/strict");
const { test } = require("node:test");
const { observeServing } = require("./verify-serving.cjs");

const expected = { url: "https://sample.invalid/healthz", version: "b", configuration: "one", secretSha256: "expected-hash" };
const matching = { version: "b", configuration: "one", secret_sha256: "expected-hash" };

test("only the exact public source, configuration and dependency start the six-minute window", async () => {
  let time = 1_000;
  let visits = 0;
  const observations = [
    { ...matching, version: "a" },
    { ...matching, configuration: "other" },
    { ...matching, secret_sha256: "other" },
    matching,
  ];
  const result = await observeServing(expected, {
    fetchHealth: async () => ({ ok: true, json: async () => observations[visits++] }),
    now: () => time,
    sleep: async (ms) => { time += ms; },
    log: () => {},
  });
  assert.equal(visits, 4);
  assert.equal(result.firstSeen, 46_000);
  assert.equal(result.checkedAt - result.firstSeen, 360_000);
});

test("an unavailable candidate expires without reaching the source check", async () => {
  let time = 0;
  let visits = 0;
  await assert.rejects(observeServing(expected, {
    fetchHealth: async () => { visits += 1; throw new Error("unavailable"); },
    now: () => time,
    sleep: async (ms) => { time += ms; },
    log: () => {},
  }), /did not serve within 90 minutes/);
  assert.equal(visits, 360);
  assert.equal(time, 5_400_000);
});
