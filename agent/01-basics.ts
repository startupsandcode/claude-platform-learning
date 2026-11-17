/**
 * Agent lesson 01: one query(), read-only tools, inside a throwaway workspace.
 *
 * Teaches: the Agent SDK is Claude Code as a library. You hand it a prompt and options, and it
 * runs the whole loop itself, streaming messages back. Your guardrails are the options you pass.
 * Three are always on here: cwd (the throwaway workspace), settingSources: [] (ignore your own
 * ~/.claude settings and hooks so the lesson behaves the same for everyone), and the lab backstop.
 *
 * Unguarded (npm run agent:01) and guarded (npm run agent:01 -- --guarded): this lesson has no
 *   break. It only shows the message stream. --guarded adds nothing and is accepted for symmetry.
 *
 * What you should see:
 *   - A Read tool call on notes.txt, a one-sentence summary, then 'result: subtype=success turns=2' at about $0.003.
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
  for await (const msg of query({
    prompt: "Read notes.txt and summarize it in one sentence.",
    options: {
      ...AGENT_BACKSTOP,
      model: MODEL,
      cwd: WORKSPACE,
      settingSources: [],
      allowedTools: ["Read", "Glob"],
    },
  })) {
    logMessage(msg);
  }
}

if (import.meta.main) main().catch(exitOnError);
