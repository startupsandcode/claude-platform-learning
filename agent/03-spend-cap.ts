/**
 * Agent lesson 03: spend cap (maxBudgetUsd).
 *
 * Teaches: maxBudgetUsd stops the query once its running cost estimate passes a dollar limit.
 * Turns cost different amounts as context grows, so a dollar cap protects you better than a
 * turn cap alone. The result subtype tells you why it stopped.
 *
 * Unguarded (npm run agent:03): only the lab backstop applies ($0.25 / 25 turns).
 * Guarded (npm run agent:03 -- --guarded): maxBudgetUsd is $0.003.
 *
 * What you should see:
 *   - Same 40-file chain task.
 *   - Unguarded: stops at the backstop's 25 turns.
 *   - Guarded: 'subtype=error_max_budget_usd' after about 9 turns at roughly $0.003. The cost can land slightly above the cap because it is checked between steps.
 */
import { query } from "@anthropic-ai/claude-agent-sdk";
import { MODEL } from "../lib/pricing.ts";
import { AGENT_BACKSTOP, exitOnError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";
import { logMessage } from "../lib/agent-log.ts";
import { resetWorkspace, WORKSPACE } from "../scripts/reset-workspace.ts";

async function main() {
  requireApiKey();
  resetWorkspace();
  const guarded = process.argv.includes("--guarded");
  let lastSubtype = "";
  try {
  for await (const msg of query({
    prompt:
      "Start at chain-01.txt. Each file tells you the next file to read. Follow the chain one file at a time until you reach the end, then tell me the secret word.",
    options: {
      ...AGENT_BACKSTOP,
      ...(guarded ? { maxBudgetUsd: 0.003 } : {}),
      model: MODEL,
      cwd: WORKSPACE,
      settingSources: [],
      allowedTools: ["Read"],
    },
  })) {
    logMessage(msg);
    if (msg.type === "result") lastSubtype = msg.subtype;
  }
  } catch (err) {
    // The SDK throws after an error result. When the guardrail we asked for fired, that is success.
    if (guarded && lastSubtype === "error_max_budget_usd") {
      console.log("maxBudgetUsd stopped the agent. This is the guardrail working, not a bug.");
      return;
    }
    throw err;
  }
}

if (import.meta.main) main().catch(exitOnError);
