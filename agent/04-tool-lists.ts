/**
 * Agent lesson 04: tool lists (tools, allowedTools, disallowedTools).
 *
 * Teaches three different knobs that are easy to confuse:
 *   - tools:           which built-in tools exist for the model at all
 *   - allowedTools:    which tools run WITHOUT asking (auto-approved)
 *   - disallowedTools: tools that are always refused
 * The smallest set of tools that does the job is the strongest guardrail: a tool the agent
 * does not have cannot be misused, however it is prompted.
 *
 * Unguarded (npm run agent:04): the full toolset incl. Bash, Write and Edit, all auto-approved.
 *   Asked to tidy the workspace, the agent deletes and writes files. (Only safe because cwd is a
 *   throwaway folder: Bash can reach anything your user can.)
 * Guarded (npm run agent:04 -- --guarded): tools is read-only (Read, Glob, Grep) and
 *   disallowedTools names Bash, Write and Edit too. The agent reports it cannot do the job.
 *
 * What you should see:
 *   - Unguarded: 'todo.txt still exists: false; tidy-report.txt created: true'. The agent really changed the workspace.
 *   - Guarded: 'todo.txt still exists: true; tidy-report.txt created: false'. The agent has no tool that can do it and tells you so (it may print the commands it would have run).
 */
import { query } from "@anthropic-ai/claude-agent-sdk";
import { MODEL } from "../lib/pricing.ts";
import { AGENT_BACKSTOP, exitOnError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";
import { logMessage } from "../lib/agent-log.ts";
import { resetWorkspace, WORKSPACE } from "../scripts/reset-workspace.ts";
import { readdirSync } from "node:fs";

async function main() {
  requireApiKey();
  resetWorkspace();
  const guarded = process.argv.includes("--guarded");

  for await (const msg of query({
    prompt:
      "Tidy this workspace: delete todo.txt, then create tidy-report.txt that says what you did. Only touch files in the current folder.",
    options: {
      ...AGENT_BACKSTOP,
      model: MODEL,
      cwd: WORKSPACE,
      settingSources: [],
      ...(guarded
        ? { tools: ["Read", "Glob", "Grep"], disallowedTools: ["Bash", "Write", "Edit"] }
        : { allowedTools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"] }),
    },
  })) {
    logMessage(msg);
  }

  const after = readdirSync(WORKSPACE);
  console.log(`\ntodo.txt still exists: ${after.includes("todo.txt")}; tidy-report.txt created: ${after.includes("tidy-report.txt")}`);
}

if (import.meta.main) main().catch(exitOnError);
