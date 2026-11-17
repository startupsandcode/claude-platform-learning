import { test, before } from "node:test";
import assert from "node:assert/strict";
import { resolveInWorkspace, executeTool, PathEscapeError, UnknownToolError, InvalidInputError } from "../messages/04-tool-allowlist.ts";
import { resetWorkspace, WORKSPACE } from "../scripts/reset-workspace.ts";

before(() => resetWorkspace());

test("a file inside the workspace resolves", () => {
  assert.ok(resolveInWorkspace(WORKSPACE, "notes.txt").toLowerCase().endsWith("notes.txt"));
});

for (const bad of [
  "../decoy/CANARY.txt",
  "..\\decoy\\CANARY.txt",
  "C:\\Windows\\win.ini",
  "c:\\windows\\win.ini",
  "\\\\host\\share\\x",
  "notes.txt/../../x",
  "notes.txt\0.png",
  "",
]) {
  test(`escape attempt is denied: ${JSON.stringify(bad)}`, () => {
    assert.throws(() => resolveInWorkspace(WORKSPACE, bad), PathEscapeError);
  });
}

test("unknown tool name is rejected", () => {
  assert.throws(() => executeTool("delete_file", {}, WORKSPACE), UnknownToolError);
});
test("bad input shape is rejected", () => {
  assert.throws(() => executeTool("read_file", { path: 5 }, WORKSPACE), InvalidInputError);
  assert.throws(() => executeTool("read_file", null, WORKSPACE), InvalidInputError);
});
test("read_file returns file contents inside the workspace", () => {
  assert.match(executeTool("read_file", { path: "notes.txt" }, WORKSPACE), /Meeting notes/);
});
