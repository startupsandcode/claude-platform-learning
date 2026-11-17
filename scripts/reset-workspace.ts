// Recreates workspace/ so every Agent lesson starts from the same state.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), "..", "workspace");

export const CHAIN_LENGTH = 40;

export function resetWorkspace(): void {
  rmSync(WORKSPACE, { recursive: true, force: true });
  mkdirSync(WORKSPACE, { recursive: true });
  writeFileSync(join(WORKSPACE, "notes.txt"), "Meeting notes\n- Ship the sandbox\n- Learn guardrails by breaking things\n");
  writeFileSync(join(WORKSPACE, "todo.txt"), "1. read notes.txt\n2. tidy up\n");
  // A 40-file chain: each file names the next, so an agent cannot skip ahead or batch the reads.
  // Used by the turn-limit and spend-cap lessons to guarantee a long-running task.
  for (let i = 1; i <= CHAIN_LENGTH; i++) {
    const name = `chain-${String(i).padStart(2, "0")}.txt`;
    const next = `chain-${String(i + 1).padStart(2, "0")}.txt`;
    writeFileSync(join(WORKSPACE, name), i < CHAIN_LENGTH ? `Next file to read: ${next}\n` : "END. The secret word is sandwich.\n");
  }
}

if (import.meta.main) {
  resetWorkspace();
  console.log(`workspace reset: ${WORKSPACE}`);
}
