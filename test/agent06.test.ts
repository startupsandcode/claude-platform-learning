import { test } from "node:test";
import assert from "node:assert/strict";
import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";
import { createCanUseTool } from "../agent/06-approval-jail.ts";
import { WORKSPACE } from "../scripts/reset-workspace.ts";

const opts = { signal: new AbortController().signal } as Parameters<CanUseTool>[2];
const never = async () => {
  throw new Error("ask should not be called");
};
const answer = (a: string | null) => async () => a;

test("Read inside the workspace is allowed without asking", async () => {
  const r = await createCanUseTool(WORKSPACE, never)("Read", { file_path: "notes.txt" }, opts);
  assert.equal(r!.behavior, "allow");
});

for (const bad of ["../decoy/CANARY.txt", "..\\decoy\\CANARY.txt", "C:\\Windows\\win.ini", "c:\\windows\\win.ini", "\\\\host\\share\\x", "x\0y"]) {
  test(`Read outside the workspace is denied: ${JSON.stringify(bad)}`, async () => {
    const r = await createCanUseTool(WORKSPACE, never)("Read", { file_path: bad }, opts);
    assert.equal(r!.behavior, "deny");
  });
}

test("Grep and Glob with an outside path are denied", async () => {
  const can = createCanUseTool(WORKSPACE, never);
  assert.equal((await can("Grep", { pattern: "CANARY", path: ".." }, opts))!.behavior, "deny");
  assert.equal((await can("Glob", { pattern: "*.txt", path: "../decoy" }, opts))!.behavior, "deny");
});

test("Glob with no path (defaults to cwd) is allowed", async () => {
  assert.equal((await createCanUseTool(WORKSPACE, never)("Glob", { pattern: "*.txt" }, opts))!.behavior, "allow");
});

test("Bash asks the human: null (closed stdin) denies", async () => {
  assert.equal((await createCanUseTool(WORKSPACE, answer(null))("Bash", { command: "ls" }, opts))!.behavior, "deny");
});

test("Bash asks the human: y allows, n denies, a throwing prompt denies", async () => {
  assert.equal((await createCanUseTool(WORKSPACE, answer("y"))("Bash", { command: "ls" }, opts))!.behavior, "allow");
  assert.equal((await createCanUseTool(WORKSPACE, answer("n"))("Bash", { command: "ls" }, opts))!.behavior, "deny");
  assert.equal((await createCanUseTool(WORKSPACE, never)("Bash", { command: "ls" }, opts))!.behavior, "deny");
});
