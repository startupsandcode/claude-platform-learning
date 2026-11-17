import { test } from "node:test";
import assert from "node:assert/strict";
import { requestApproval } from "../messages/06-approval.ts";

const answers = (a: string | null) => async () => a;

test("y and YES (with whitespace) approve", async () => {
  assert.equal(await requestApproval("write file", answers("y")), true);
  assert.equal(await requestApproval("write file", answers(" YES ")), true);
});
test("empty, n, yep and closed stdin all deny", async () => {
  for (const a of ["", "n", "yep", null]) assert.equal(await requestApproval("write file", answers(a)), false);
});
test("a throwing prompt denies", async () => {
  assert.equal(
    await requestApproval("write file", async () => {
      throw new Error("stdin closed");
    }),
    false,
  );
});
