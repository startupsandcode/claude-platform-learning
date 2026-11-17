import { test } from "node:test";
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { runToolLoop } from "../messages/02-loop-limits.ts";

type Msg = Anthropic.Message;
const toolTurn = (n = 1): Msg =>
  ({
    stop_reason: "tool_use",
    content: Array.from({ length: n }, (_, i) => ({ type: "tool_use", id: `t${i}`, name: "ping", input: {} })),
    usage: { input_tokens: 1, output_tokens: 1 },
  }) as unknown as Msg;
const endTurn = (): Msg =>
  ({ stop_reason: "end_turn", content: [{ type: "text", text: "done" }], usage: { input_tokens: 1, output_tokens: 1 } }) as unknown as Msg;

test("stops at maxTurns when the model never stops calling tools", async () => {
  const result = await runToolLoop(async () => toolTurn(), { maxTurns: 3 });
  assert.deepEqual(result, { turns: 3, stopped: "max_turns" });
});

test("ends normally when the model finishes before maxTurns", async () => {
  let calls = 0;
  const result = await runToolLoop(async () => (++calls === 2 ? endTurn() : toolTurn()), { maxTurns: 5 });
  assert.deepEqual(result, { turns: 2, stopped: "end_turn" });
});

test("all tool results from one turn go back in a single user message", async () => {
  const seen: string[] = [];
  let calls = 0;
  await runToolLoop(
    async (messages) => {
      seen.push(JSON.stringify(messages.at(-1)));
      return ++calls === 1 ? toolTurn(2) : endTurn();
    },
    { maxTurns: 5 },
  );
  const last = JSON.parse(seen[1]);
  assert.equal(last.role, "user");
  assert.equal(last.content.length, 2);
  assert.ok(last.content.every((b: { type: string }) => b.type === "tool_result"));
});
