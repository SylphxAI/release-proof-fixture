const assert = require("node:assert/strict");
const { test } = require("node:test");
const { sourceInvariant } = require("./source.cjs");

test("full source invariant holds", () => {
  assert.equal(sourceInvariant, true);
});
