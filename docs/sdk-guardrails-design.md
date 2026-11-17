# SDK Guardrails Sandbox: Design

Date: 2026-11-16. Status: awaiting John's approval.

## Intent and why

John wants a sandbox to learn the Anthropic Messages SDK (`@anthropic-ai/sdk`) and the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) by breaking things. Both need guardrails, and he wants to understand each step of implementing them, not just receive working code.

The sandbox is a learning tool. It is not a product, a template, or something wired into the john-os cockpit.

## Goals

- Two parallel tracks (Messages, Agent), each a numbered series of short lessons.
- Every lesson shows a failure first (unguarded), then the same script with the guardrail on, so John sees what the guardrail actually prevents.
- Each lesson is a single readable file with a short "what you should see" note. No chasing imports to understand it.
- The two tracks follow the same guardrail sequence so John can compare how each SDK expresses the same idea.
- Every run is cheap and bounded, even the deliberately broken ones.

## Non-goals

- Not production-grade security. Lesson text must say that in-process guardrails are not a security boundary, and that real isolation means an OS or container sandbox.
- No UI, no server, no integration with `app/`, no scheduling.
- Not a general eval or testing framework.

## Anti-goals (would make this a failure even if it works)

- A broken lesson that really spends real money or touches real john-os files.
- Guardrail logic hidden in a shared harness so the lesson teaches nothing.
- Lessons that run but leave John unable to explain why each guardrail works.

## Constraints

- TypeScript on Node 24 (already installed). The repo has no existing SDK code, so this is the first dependency in the repo.
- Lives in `sandbox/` with its own `package.json`. Code is not `.md`, so it goes on a feature branch + PR per CLAUDE.md. This design doc is `.md` and goes to `main`.
- Model for all lessons: `claude-haiku-5-5` (John's choice, for cost). Haiku 5.5 notes: no non-default `temperature`/`top_p`, no prefill, adaptive thinking on by default (set low effort to keep tokens down).
- `ANTHROPIC_API_KEY` comes from a git-ignored `sandbox/.env` (`.env` is already ignored). Ship a `sandbox/.env.example`. Builder confirms with John how he wants to supply the key before writing code (he may use `ant auth login` instead).
- Agent SDK lessons run only inside `sandbox/workspace/`, a throwaway folder that is reset between runs.
- A lab-wide backstop (`sandbox/lib/backstop.ts`, the only shared code) hard-stops any run at about $0.25 regardless of what a lesson does. It is a safety net, not the lesson content, and it is clearly labeled as such.

## Approaches considered

| | Trade-off |
|---|---|
| **A. Numbered lessons, one script each** (chosen by John) | Some repeated code, but each lesson is readable alone and a break is one small edit. |
| B. One lab CLI with guardrail switches | Less code, but hides the guardrail logic that is the thing being learned. |
| C. Written walkthrough, minimal code | Cheapest, but nothing to run or break. |

## The parts John decided

- Approach A, TypeScript/Node, Haiku 5.5.

## The parts decided on his behalf (his calls to correct)

- Lessons run as `npm run msg:01`, `npm run agent:03`, etc. Unguarded by default; add `-- --guarded` for the fixed version. Same file, one flag, so the diff between broken and fixed stays visible.
- Messages track uses a hand-written tool loop, not the SDK tool runner, because the guardrails (turn caps, approval, validation) are about owning the loop.
- Agent "break" demos target a decoy `sandbox/decoy/CANARY.txt` placed outside `workspace/`, never the real `.env` or any john-os file.

## Lesson plan

Both tracks follow this guardrail order. Lesson numbers match across tracks.

| # | Guardrail | Messages track (`sandbox/messages/`) | Agent track (`sandbox/agent/`) |
|---|---|---|---|
| 01 | Basics + hard output cap | One call; set `max_tokens`; read `stop_reason` and `usage`. Break: tiny cap truncates mid-answer, and ignoring `stop_reason` hides it. | One `query()` with read-only tools in `workspace/`. Show the message stream. |
| 02 | Turn and loop limits | Tool loop. Break: model keeps calling a tool forever. Fix: max turns. | Break: open-ended task runs long. Fix: `maxTurns`. |
| 03 | Spend cap | Meter cost from `usage`; abort past a budget. | `maxBudgetUsd` (verify exact option name). Show what stopping looks like. |
| 04 | Tool allowlist and validation | Only declared tools run; unknown names rejected; inputs validated; file tool limited to `workspace/`. Break: tool reads any path. | Allow/deny tool lists. Break: agent has Bash and edits freely. |
| 05 | Input/output checks and injection | Length and pattern screen on input; secret-pattern redaction on output; a tool result containing an injected instruction. | Hooks (`PreToolUse`) that block dangerous commands and writes. Same injection scenario via a file the agent reads. |
| 06 | Human approval and path jail | Terminal confirm before a risky tool runs. | `canUseTool` approval callback + working-directory jail; break: agent tries to read `decoy/CANARY.txt`. Lesson ends by naming what this does not protect against. |

## What is left to the builder

- Exact SDK option names and signatures: verify against the current Agent SDK docs (`code.claude.com/docs/en/agent-sdk`) and the Messages SDK TypeScript docs before writing each lesson. Do not rely on this doc's option names.
- Folder layout details, lesson README wording, reset script for `workspace/`.
- Whether `npm run` scripts or a tiny runner is cleaner.
- Verification: run every lesson both ways with a real key at least once and record what was seen, so the "what you should see" notes are true.

## Process notes

- Claim the work on TASKLOG.md via `node app/cli.mjs` before building.
- Build on a feature branch; open a PR. This design doc commits straight to `main`.
