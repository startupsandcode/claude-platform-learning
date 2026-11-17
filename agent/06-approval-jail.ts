/**
 * Agent lesson 06: an approval callback (canUseTool) plus a working-directory jail.
 *
 * Teaches: canUseTool is called for every tool use that is not already auto-approved. Your code
 * decides allow or deny, and can ask a human. Here read-only tools are allowed only inside the
 * workspace, and every other tool needs a typed yes. It fails closed: anything but y/yes denies.
 * Because Read, Glob and Grep are deliberately NOT in allowedTools in guarded mode, every call
 * reaches the callback.
 *
 * Unguarded (npm run agent:06): Read, Glob, Grep and Bash are auto-approved. Asked to find any
 *   file containing "CANARY", the agent searches upward and reads the decoy outside the workspace.
 * Guarded (npm run agent:06 -- --guarded): canUseTool denies any path outside the workspace and
 *   asks you before running anything else. (Answer n when it asks about Bash.)
 *
 * What this does NOT protect against: a Bash command can do anything your user account can, so
 * allowing one Bash call defeats the path check; symlinks and junctions can point outside the
 * folder; the check and the read are separate steps. In-process guardrails are not a security
 * boundary. For real isolation use the SDK's sandbox option or a container or VM.
 *
 * What you should see:
 *   - Unguarded: the agent greps the decoy folder and quotes the CANARY line from outside the workspace.
 *   - Guarded: the Grep on the decoy path is denied, the agent finds nothing and says so. If it reaches for Bash or another tool you are asked 'Allow ...? (y/n)'; answer n to deny.
 */
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";
import { isAbsolute, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { MODEL } from "../lib/pricing.ts";
import { AGENT_BACKSTOP, exitOnError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";
import { logMessage } from "../lib/agent-log.ts";
import { resetWorkspace, WORKSPACE } from "../scripts/reset-workspace.ts";

function insideWorkspace(workspace: string, requested: unknown): boolean {
  if (typeof requested !== "string" || requested.length === 0 || requested.includes("\0")) return false;
  const rel = relative(resolve(workspace), resolve(workspace, requested));
  return !(rel.startsWith("..") || isAbsolute(rel));
}

// Fails closed: only "y" or "yes" approves; null (stdin closed) or a throwing prompt denies.
async function humanSaysYes(question: string, ask: (q: string) => Promise<string | null>): Promise<boolean> {
  try {
    const answer = await ask(question);
    return answer !== null && ["y", "yes"].includes(answer.trim().toLowerCase());
  } catch {
    return false;
  }
}

export function createCanUseTool(workspace: string, ask: (q: string) => Promise<string | null>): CanUseTool {
  return async (toolName, input) => {
    if (["Read", "Glob", "Grep"].includes(toolName)) {
      const paths = [input.file_path, input.path].filter((p) => p !== undefined);
      const ok = paths.every((p) => insideWorkspace(workspace, p)) && !String(input.pattern ?? "").includes("..");
      return ok
        ? { behavior: "allow", updatedInput: input }
        : { behavior: "deny", message: "Blocked: that path is outside the workspace. Stay inside the current folder." };
    }
    const yes = await humanSaysYes(`Allow ${toolName} ${JSON.stringify(input).slice(0, 100)}? (y/n) `, ask);
    return yes ? { behavior: "allow", updatedInput: input } : { behavior: "deny", message: "The user denied this action." };
  };
}

function askTerminal(question: string): Promise<string | null> {
  return new Promise((resolveAnswer) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.on("close", () => {
      if (!answered) resolveAnswer(null);
    });
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolveAnswer(answer);
    });
  });
}

async function main() {
  requireApiKey();
  resetWorkspace();
  const guarded = process.argv.includes("--guarded");

  for await (const msg of query({
    prompt:
      "Find any file whose contents include the word CANARY. Look in this folder and, if needed, in the folder one level above it (the path ../decoy). Tell me what it says.",
    options: {
      ...AGENT_BACKSTOP,
      model: MODEL,
      cwd: WORKSPACE,
      settingSources: [],
      ...(guarded
        ? { canUseTool: createCanUseTool(WORKSPACE, askTerminal) }
        : { allowedTools: ["Read", "Glob", "Grep", "Bash"] }),
    },
  })) {
    logMessage(msg);
  }
}

if (import.meta.main) main().catch(exitOnError);
