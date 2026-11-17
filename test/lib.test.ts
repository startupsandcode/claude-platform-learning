import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { costUsd } from "../lib/pricing.ts";
import { createBackstop, BackstopError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";
import { resetWorkspace, WORKSPACE } from "../scripts/reset-workspace.ts";

test("costUsd prices Haiku 5.5 at $0.10 in / $0.50 out per million", () => {
  assert.equal(costUsd({ input_tokens: 1_000_000, output_tokens: 1_000_000 }), 0.6);
});

test("backstop throws when cumulative cost passes maxUsd", () => {
  const b = createBackstop({ maxUsd: 0.5, maxCalls: 100 });
  b.record({ input_tokens: 1_000_000, output_tokens: 0 }); // 0.10
  assert.throws(() => b.record({ input_tokens: 0, output_tokens: 1_000_000 }), BackstopError); // 0.60 total
});

test("backstop throws when call count passes maxCalls", () => {
  const b = createBackstop({ maxUsd: 100, maxCalls: 2 });
  b.record({ input_tokens: 1, output_tokens: 1 });
  b.record({ input_tokens: 1, output_tokens: 1 });
  assert.throws(() => b.record({ input_tokens: 1, output_tokens: 1 }), BackstopError);
});

test("requireApiKey rejects a missing key and points at .env", () => {
  assert.throws(() => requireApiKey({}), /\.env\.example/);
});

test("requireApiKey rejects a whitespace-only key", () => {
  assert.throws(() => requireApiKey({ ANTHROPIC_API_KEY: "  " }), /\.env\.example/);
});

test("requireApiKey returns a trimmed key", () => {
  assert.equal(requireApiKey({ ANTHROPIC_API_KEY: " sk-ant-x " }), "sk-ant-x");
});

test("resetWorkspace twice yields identical contents", () => {
  const snap = () => readdirSync(WORKSPACE).sort().map((f) => [f, readFileSync(`${WORKSPACE}/${f}`, "utf8")]);
  resetWorkspace();
  const a = snap();
  resetWorkspace();
  assert.deepEqual(snap(), a);
  assert.ok(a.length >= 2);
});
