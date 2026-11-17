/**
 * Agent lesson 02: turn limits (maxTurns).
 *
 * Teaches: an agent keeps working until it decides it is done. maxTurns caps how many
 * model/tool round trips it gets, and hitting it is reported as a result, not an exception.
 *
 * Unguarded (npm run agent:02): only the lab backstop (maxTurns 25) applies, and the prompt asks
 *   for far more reads than that.
 * Guarded (npm run agent:02 -- --guarded): maxTurns is 3.
 *
 * What you should see:
 *   - The task is a 40-file chain where each file names the next, so the agent cannot batch or skip ahead.
 *   - Unguarded: runs to the backstop, 'result: subtype=error_max_turns turns=26', then an Error (exit 1).
 *   - Guarded: 'subtype=error_max_turns turns=4' and the lesson prints that this is the guardrail working (exit 0). The SDK throws after an error result, so the lesson catches it.
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
      ...(guarded ? { maxTurns: 3 } : {}),
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
    if (guarded && lastSubtype === "error_max_turns") {
      console.log("maxTurns stopped the agent. This is the guardrail working, not a bug.");
      return;
    }
    throw err;
  }
}

if (import.meta.main) main().catch(exitOnError);
