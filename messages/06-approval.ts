/**
 * Messages lesson 06: human approval before a risky tool runs.
 *
 * Teaches: for actions that change things (write a file, send an email), the safest guardrail is
 * a person saying yes. Approval must fail closed: anything but a clear yes is a no.
 *
 * Unguarded (npm run msg:06): the model's write_file call runs immediately.
 * Guarded (npm run msg:06 -- --guarded): the terminal asks "Allow? (y/n)" first; a no goes back
 *   to the model as an is_error tool result. Try answering n, then y.
 *
 * NOT a security boundary: it only protects against actions a human would have refused.
 *
 * What you should see:
 *   - Unguarded: 'wrote hello.txt' with no question asked.
 *   - Guarded: prompts 'Allow: write hello.txt? (y/n)'. n, empty, anything but y/yes, or closed stdin all deny and the model reports the denial. y writes the file.
 */
import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { MODEL } from "../lib/pricing.ts";
import { createBackstop, exitOnError } from "../lib/backstop.ts";
import { requireApiKey } from "../lib/env.ts";
import { resetWorkspace, WORKSPACE } from "../scripts/reset-workspace.ts";

// Fails closed: only "y" or "yes" approves. A prompt that throws or returns null (stdin closed) denies.
export async function requestApproval(description: string, ask: (question: string) => Promise<string | null>): Promise<boolean> {
  try {
    const answer = await ask(`Allow: ${description}? (y/n) `);
    if (answer === null) return false;
    return ["y", "yes"].includes(answer.trim().toLowerCase());
  } catch {
    return false;
  }
}

function askTerminal(question: string): Promise<string | null> {
  return new Promise((resolveAnswer) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.on("close", () => {
      if (!answered) resolveAnswer(null); // stdin closed with no answer
    });
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolveAnswer(answer);
    });
  });
}

function writeInsideWorkspace(path: string, content: string): void {
  const full = resolve(WORKSPACE, path);
  const rel = relative(WORKSPACE, full);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) throw new Error(`path escapes the workspace: ${path}`);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

async function main() {
  const client = new Anthropic({ apiKey: requireApiKey() });
  const backstop = createBackstop();
  const guarded = process.argv.includes("--guarded");
  resetWorkspace();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "Create a file called hello.txt containing a one-line greeting, using write_file. Then confirm what happened." },
  ];
  for (let turn = 0; turn < 5; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      output_config: { effort: "low" },
      tools: [
        {
          name: "write_file",
          description: "Write a text file inside the workspace folder.",
          input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
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
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const b of response.content) {
      if (b.type !== "tool_use") continue;
      const { path, content } = b.input as { path: string; content: string };
      if (guarded && !(await requestApproval(`write ${JSON.stringify(path)}`, askTerminal))) {
        results.push({ type: "tool_result", tool_use_id: b.id, content: "The user denied this action.", is_error: true });
        continue;
      }
      try {
        writeInsideWorkspace(path, content);
        results.push({ type: "tool_result", tool_use_id: b.id, content: `wrote ${path}` });
        console.log(`wrote ${path}`);
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: b.id, content: String(err), is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
}

if (import.meta.main) main().catch(exitOnError);
