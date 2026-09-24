const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePlan } = require("../assets/js/build-planner.js");

const base = {
  workloads: { other: true },
  jellyfinMode: "direct",
  vm: "none",
  storage: "light",
  internalExpansion: false,
  owned: "none",
  priority: "quiet"
};

function plan(changes) {
  return evaluatePlan({ ...base, ...changes, workloads: { ...base.workloads, ...(changes.workloads || {}) } });
}

test("light services with little local storage favor a compact mini PC", () => {
  const result = plan({});
  assert.equal(result.route, "mini");
  assert.equal(result.alternative, "expandable");
  assert.match(result.ram, /16–32 GB/);
  assert.match(result.otherRoutes.reuse, /No suitable machine/);
});

test("a reported suitable existing PC is tried before buying", () => {
  const result = plan({ owned: "suitable" });
  assert.equal(result.route, "reuse");
  assert.match(result.why, /Check its actual RAM/);
  assert.match(result.verify.join(" "), /ownership alone does not establish suitability/);
});

test("Jellyfin transcoding triggers exact hardware verification", () => {
  const result = plan({ workloads: { jellyfin: true }, jellyfinMode: "transcoding" });
  assert.equal(result.route, "mini");
  assert.match(result.mainConstraint, /exact CPU\/GPU/);
  assert.match(result.verify.join(" "), /codec/);
});

test("one or two lightweight VMs stay a conditional compact route", () => {
  const result = plan({ vm: "light" });
  assert.equal(result.route, "mini");
  assert.match(result.ram, /16–32 GB/);
  assert.match(result.ram, /guest allocations/);
});

test("three or more heavier VMs favor expansion", () => {
  const result = plan({ vm: "heavy" });
  assert.equal(result.route, "expandable");
  assert.match(result.ram, /32–64 GB/);
  assert.match(result.mainConstraint, /full-VM load/);
});

test("local storage growth and multiple drives favor an expandable chassis", () => {
  const result = plan({ storage: "local", internalExpansion: true });
  assert.equal(result.route, "expandable");
  assert.match(result.storageGuidance, /drive count/);
  assert.match(result.otherRoutes.mini, /internal expansion/);
});

test("small and quiet priority conflicting with heavy VMs is exposed", () => {
  const result = plan({ vm: "heavy", priority: "quiet" });
  assert.equal(result.route, "expandable");
  assert.equal(result.conflict, true);
  assert.equal(result.alternative, "mini");
  assert.match(result.otherRoutes.mini, /only after verifying/);
});

test("unknown storage and uncertain existing hardware do not imply a proven fit", () => {
  const result = plan({ storage: "uncertain", owned: "uncertain" });
  assert.equal(result.uncertain, true);
  assert.notEqual(result.route, "reuse");
  assert.match(result.storageGuidance, /No drive size can be recommended/);
  assert.match(result.otherRoutes.reuse, /fit is uncertain/);
});

test("missing workload or unanswered questions require input", () => {
  assert.equal(plan({ workloads: { other: false } }).status, "needs_input");
  assert.equal(plan({ priority: "" }).status, "needs_input");
});

test("lowest cost prompts a used-system comparison without a price claim", () => {
  const result = plan({ priority: "cost" });
  assert.equal(result.route, "expandable");
  assert.match(result.why, /compare the actual complete system price/);
});
