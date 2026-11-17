/**
 * Messages lesson 01: one call, a hard output cap, and reading stop_reason.
 *
 * Teaches: max_tokens is a hard ceiling the model does not know about, and
 * stop_reason is how you find out it was hit (or that the model refused).
 *
 * Unguarded (npm run msg:01): max_tokens is tiny and the code prints whatever text
 *   came back without looking at stop_reason, so a cut-off answer looks complete.
 * Guarded (npm run msg:01 -- --guarded): sane max_tokens, stop_reason is checked,
 *   usage is printed so you can see what the call cost.
 *
 * What you should see:
 *   - Unguarded: the answer stops mid-word (60 tokens) and nothing tells you it was cut off.
 *   - Guarded: a full answer, stop_reason=end_turn, and a usage line (about 34 in / 213 out tokens).
 */
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "../lib/pricing.ts";
import { createBackstop, exitOnError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";

const guarded = process.argv.includes("--guarded");

async function main() {
  const client = new Anthropic({ apiKey: requireApiKey() });
  const backstop = createBackstop();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: guarded ? 1024 : 60,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "Explain in four or five sentences why a hard output cap matters for LLM apps." }],
  });
  backstop.record(response.usage);

  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  console.log(text || "(no text came back)");

  if (guarded) {
    if (response.stop_reason === "max_tokens") console.warn("\nWARNING: answer was cut off by max_tokens");
    if (response.stop_reason === "refusal") console.warn("\nWARNING: the model refused");
    console.log(`\nstop_reason=${response.stop_reason} usage=${JSON.stringify(response.usage)}`);
  }
}

if (import.meta.main) main().catch(exitOnError);
