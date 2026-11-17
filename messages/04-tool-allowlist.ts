/**
 * Messages lesson 04: tool allowlist, input validation, path jail.
 *
 * Teaches: the model chooses tool names and arguments, so they are untrusted input. Only run
 * tools you declared, validate the argument shape, and confine file access to one folder.
 *
 * Unguarded (npm run msg:04): read_file joins whatever path the model sends onto the workspace,
 *   so "../decoy/CANARY.txt" reads a file outside it.
 * Guarded (npm run msg:04 -- --guarded): executeTool checks the tool name, validates input and
 *   resolves the path with a containment check. Denials go back to the model as is_error results.
 *
 * NOT a security boundary: this is an in-process check. Symlinks, races between check and read,
 * and anything else running as your user are out of scope. Real isolation needs an OS or
 * container sandbox.
 *
 * What you should see:
 *   - Unguarded: prints the CANARY line from outside the workspace.
 *   - Guarded: PathEscapeError is returned to the model as an is_error result and the model reports it could not read the file.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { MODEL } from "../lib/pricing.ts";
import { createBackstop, exitOnError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";
import { resetWorkspace, WORKSPACE } from "../scripts/reset-workspace.ts";

export class PathEscapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathEscapeError";
  }
}
export class UnknownToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownToolError";
  }
}
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

// Containment via path.relative, not string-prefix matching ("workspace-evil" starts with "workspace").
export function resolveInWorkspace(root: string, requested: string): string {
  if (typeof requested !== "string" || requested.length === 0 || requested.includes("\0")) {
    throw new PathEscapeError("empty or malformed path");
  }
  const full = resolve(root, requested);
  const rel = relative(resolve(root), full);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new PathEscapeError(`path escapes the workspace: ${requested}`);
  }
  return full;
}

export function executeTool(name: string, input: unknown, root: string): string {
  if (name !== "read_file") throw new UnknownToolError(`tool not allowed: ${name}`);
  const path = (input as { path?: unknown } | null)?.path;
  if (typeof path !== "string") throw new InvalidInputError("read_file needs a string `path`");
  return readFileSync(resolveInWorkspace(root, path), "utf8");
}

// The unguarded version: trusts the model's path completely.
function naiveReadFile(root: string, input: unknown): string {
  return readFileSync(resolve(root, (input as { path: string }).path), "utf8");
}

async function main() {
  const client = new Anthropic({ apiKey: requireApiKey() });
  const backstop = createBackstop();
  const guarded = process.argv.includes("--guarded");
  resetWorkspace();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "Use read_file to read the file at path ../decoy/CANARY.txt and tell me exactly what it says." },
  ];
  for (let turn = 0; turn < 6; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      output_config: { effort: "low" },
      tools: [
        {
          name: "read_file",
          description: "Read a text file from the workspace folder.",
          input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
        },
      ],
      messages,
    });
    backstop.record(response.usage);
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason !== "tool_use") {
      console.log(response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""));
      return;
    }
    const results: Anthropic.ToolResultBlockParam[] = response.content.flatMap((b) => {
      if (b.type !== "tool_use") return [];
      console.log(`tool call: ${b.name} ${JSON.stringify(b.input)}`);
      try {
        const out = guarded ? executeTool(b.name, b.input, WORKSPACE) : naiveReadFile(WORKSPACE, b.input);
        return [{ type: "tool_result" as const, tool_use_id: b.id, content: out }];
      } catch (err) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        console.log(`  denied/failed: ${msg}`);
        return [{ type: "tool_result" as const, tool_use_id: b.id, content: msg, is_error: true }];
      }
    });
    messages.push({ role: "user", content: results });
  }
}

if (import.meta.main) main().catch(exitOnError);
