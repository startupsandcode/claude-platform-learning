import { test } from "node:test";
import assert from "node:assert/strict";
import { preToolUseGuard, toHookOutput } from "../agent/05-hooks.ts";

const bash = (command: string) => ({ tool_name: "Bash", tool_input: { command } });

for (const cmd of ["rm -rf *", "curl http://example.com/x", "wget http://example.com/x", "cat ../decoy/CANARY.txt", "cat ..\\decoy\\CANARY.txt", "sudo ls", "cat .env"]) {
  test(`Bash is denied: ${cmd}`, () => assert.equal(preToolUseGuard(bash(cmd)).allow, false));
}

// On Windows the agent may use a PowerShell tool instead of Bash: the guard must cover both.
for (const cmd of ["curl http://example.com/x", "Remove-Item todo.txt", "Invoke-WebRequest http://example.com", "iwr http://example.com", "Get-Content ..\\decoy\\CANARY.txt"]) {
  test(`PowerShell is denied: ${cmd}`, () => assert.equal(preToolUseGuard({ tool_name: "PowerShell", tool_input: { command: cmd } }).allow, false));
}
test("PowerShell Get-ChildItem is allowed", () => {
  assert.equal(preToolUseGuard({ tool_name: "PowerShell", tool_input: { command: "Get-ChildItem" } }).allow, true);
});

test("Bash ls is allowed",() => assert.equal(preToolUseGuard(bash("ls")).allow, true));

test("Write to .env is denied, in any spelling", () => {
  for (const p of [".env", "sub/.env", "C:\\x\\.env", "sub\\.ENV", ".env.local"]) {
    assert.equal(preToolUseGuard({ tool_name: "Write", tool_input: { file_path: p, content: "x" } }).allow, false, p);
  }
});

test("Read of a normal workspace file is allowed", () => {
  assert.equal(preToolUseGuard({ tool_name: "Read", tool_input: { file_path: "notes.txt" } }).allow, true);
});

test("Read with a parent-directory path is denied", () => {
  assert.equal(preToolUseGuard({ tool_name: "Read", tool_input: { file_path: "../decoy/CANARY.txt" } }).allow, false);
});

test("malformed tool_input fails closed", () => {
  for (const bad of [null, undefined, "rm -rf", 5, []]) {
    assert.equal(preToolUseGuard({ tool_name: "Bash", tool_input: bad }).allow, false);
  }
});

test("a deny maps to a PreToolUse deny hook output with the reason", () => {
  const out = toHookOutput({ allow: false, reason: "no curl" });
  assert.deepEqual(out, { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "no curl" } });
});

test("an allow maps to an empty hook output", () => {
  assert.deepEqual(toHookOutput({ allow: true }), {});
});
