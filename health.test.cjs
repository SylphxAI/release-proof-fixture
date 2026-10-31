const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { once } = require("node:events");
const { test } = require("node:test");
const { server } = require("./server.cjs");
const { version } = require("./source.cjs");

async function visit(environment, testCase) {
  const listener = server(environment);
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  try {
    await testCase(`http://127.0.0.1:${listener.address().port}`);
  } finally {
    await new Promise((resolve) => listener.close(resolve));
  }
}

test("health identifies source/configuration and hashes the test dependency", async () => {
  const secret = "local-test-value";
  await visit({ PROOF_CONFIGURATION: "one", PROOF_SECRET: secret }, async (base) => {
    const response = await fetch(`${base}/healthz`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const text = await response.text();
    assert.ok(!text.includes(secret));
    assert.deepEqual(JSON.parse(text), {
      version,
      configuration: "one",
      secret_sha256: createHash("sha256").update(secret).digest("hex"),
    });
    assert.equal((await fetch(`${base}/missing`)).status, 404);
  });
});

test("missing retained configuration or secret fails readiness", async () => {
  for (const environment of [{}, { PROOF_CONFIGURATION: "one" }, { PROOF_SECRET: "local-test-value" }]) {
    await visit(environment, async (base) => {
      assert.equal((await fetch(`${base}/healthz`)).status, 503);
    });
  }
});
