/**
 * Messages lesson 02: loop limits.
 *
 * Teaches: a tool loop is `while stop_reason === "tool_use"`. If the model never stops
 * asking for tools, nothing ends the loop but you. A max-turns cap is the simplest guardrail.
 *
 * Unguarded (npm run msg:02): no turn cap. The `ping` tool always says "not done yet", so the
 *   loop runs until the lab backstop (30 calls) kills it with a BackstopError.
 * Guarded (npm run msg:02 -- --guarded): maxTurns is 4, so the loop stops itself cleanly.
 *
 * What you should see:
 *   - Unguarded: model call lines keep scrolling until 'BackstopError: more than 30 model calls'. (With a gentler prompt the model gave up by itself after ~16 turns, so never rely on the model to stop.)
 *   - Guarded: exactly 4 model calls, then 'loop ended: stopped: max_turns'.
 */
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "../lib/pricing.ts";
import { createBackstop, exitOnError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";

type Create = (messages: Anthropic.MessageParam[]) => Promise<Anthropic.Message>;

export async function runToolLoop(
  create: Create,
  opts: { maxTurns?: number } = {},
): Promise<{ turns: number; stopped: "end_turn" | "max_turns" }> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "You are monitoring a job. Poll the ping tool until it returns status complete. Never reply with text and never give up before that; just keep polling." },
  ];
  let turns = 0;
  while (true) {
    if (opts.maxTurns !== undefined && turns >= opts.maxTurns) return { turns, stopped: "max_turns" };
    const response = await create(messages);
    turns += 1;
    // Pass the assistant content back unchanged (thinking blocks included).
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason !== "tool_use") return { turns, stopped: "end_turn" };
    // All tool results from one turn go back together in ONE user message.
    const results: Anthropic.ToolResultBlockParam[] = response.content.flatMap((b) =>
      b.type === "tool_use" ? [{ type: "tool_result" as const, tool_use_id: b.id, content: "status: pending (job still running, poll again)" }] : [],
    );
    messages.push({ role: "user", content: results });
  }
}

async function main() {
  const client = new Anthropic({ apiKey: requireApiKey() });
  const backstop = createBackstop();
  const guarded = process.argv.includes("--guarded");

  const create: Create = async (messages) => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      output_config: { effort: "low" },
      tools: [{ name: "ping", description: "Check whether the job is done.", input_schema: { type: "object", properties: {} } }],
      messages,
    });
    backstop.record(response.usage);
    console.log(`  model call: stop_reason=${response.stop_reason}`);
    return response;
  };

  const result = await runToolLoop(create, guarded ? { maxTurns: 4 } : {});
  console.log(`\nloop ended: ${JSON.stringify(result)}`);
}

if (import.meta.main) main().catch(exitOnError);
