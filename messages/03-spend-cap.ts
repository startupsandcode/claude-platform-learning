/**
 * Messages lesson 03: spend cap.
 *
 * Teaches: every response carries `usage`. Turn that into dollars yourself and stop when a
 * budget is spent. `max_tokens` limits one reply; a budget limits the whole run.
 *
 * Unguarded (npm run msg:03): keeps asking for long answers with no budget, until the lab
 *   backstop (30 calls) stops it.
 * Guarded (npm run msg:03 -- --guarded): a $0.001 budget, checked after every response.
 *
 * What you should see:
 *   - Unguarded: 30 calls, about $0.008, ended by the backstop.
 *   - Guarded: stops after call 4 with BudgetExceededError at about $0.0011. Note it overshoots slightly: the check runs after the spend.
 */
import Anthropic from "@anthropic-ai/sdk";
import { MODEL, costUsd } from "../lib/pricing.ts";
import { createBackstop, exitOnError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

// Fails closed: a nonsense spend figure stops the run instead of silently passing.
export function checkBudget(spentUsd: number, budgetUsd: number): void {
  const sane = Number.isFinite(spentUsd) && spentUsd >= 0 && Number.isFinite(budgetUsd);
  if (!sane || spentUsd >= budgetUsd) {
    throw new BudgetExceededError(`spent $${spentUsd} against a $${budgetUsd} budget`);
  }
}

async function main() {
  const client = new Anthropic({ apiKey: requireApiKey() });
  const backstop = createBackstop();
  const guarded = process.argv.includes("--guarded");
  const budgetUsd = 0.001;
  let spent = 0;

  for (let call = 1; ; call++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: `Write about 300 words on topic number ${call}: a small everyday object.` }],
    });
    backstop.record(response.usage);
    spent += costUsd(response.usage);
    console.log(`call ${call}: spent so far $${spent.toFixed(5)}`);
    if (guarded) checkBudget(spent, budgetUsd);
  }
}

if (import.meta.main) main().catch(exitOnError);
