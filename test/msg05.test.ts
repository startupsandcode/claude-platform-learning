import { test } from "node:test";
import assert from "node:assert/strict";
import { screenInput, redactSecrets } from "../messages/05-io-checks.ts";

test("empty input is rejected", () => {
  assert.equal(screenInput("").ok, false);
  assert.equal(screenInput("   \n").ok, false);
});
test("over-length input is rejected (default 2000)", () => assert.equal(screenInput("a".repeat(2001)).ok, false));
test("normal text and unicode are accepted", () => {
  assert.equal(screenInput("hello world").ok, true);
  assert.equal(screenInput("héllo 🌍 世界").ok, true);
});
test("redactSecrets masks Anthropic keys and AWS ids, leaves other text", () => {
  const out = redactSecrets("key sk-ant-api03-abcDEF123_xyz and AKIAABCDEFGHIJKLMNOP ok");
  assert.equal(out, "key [REDACTED] and [REDACTED] ok");
});
test("redactSecrets handles several secrets in one string", () => {
  assert.equal(redactSecrets("sk-ant-aaaaaaaaaa sk-ant-bbbbbbbbbb"), "[REDACTED] [REDACTED]");
});
test("redactSecrets leaves clean text unchanged", () => assert.equal(redactSecrets("nothing here"), "nothing here"));
