# Platform Lessons: Design

Date: 2026-11-17. Status: awaiting John's approval.

## Intent and why

John wants to learn the Claude platform itself, not only the chat app or Claude Code. The guardrails lessons taught two SDKs by breaking things. This set teaches the wider platform features by running small experiments and measuring the result.

## Goals

- Five new lessons in a new `platform/` folder, run with `npm run plat:01` to `plat:05`:
  1. Streaming (Messages SDK): show output as it arrives, read the stream events.
  2. Prompt caching (Messages SDK): same long prompt with and without caching, compare `usage` and cost.
  3. Structured output (Messages SDK): turn messy text into reliable JSON for a john-os style task, using synthetic sample text.
  4. A small MCP server plus a client that calls it.
  5. A `Stop` hook (Agent SDK): keep Claude going until a condition holds.
- Move the existing lessons into `guardrails/` (with `messages/` and `agent/` inside it).
- Same lesson style as before: one readable file per lesson, a header comment saying what it teaches and what you should see, cheap runs, the shared cost backstop.

## Non-goals

- No UI, no server hosting, no tie-in to the john-os app or its real files.
- Not production hardening. Not an eval framework.
- No new lessons beyond these five in this pass.

## Anti-goals

- A lesson that runs but leaves John unable to explain what it showed.
- Guessed API behavior written into a "what you should see" note. Every note comes from a real run.
- Any lesson reading real john-os files or spending past the backstop.

## Constraints

- TypeScript on Node 24, one `package.json`, model `claude-haiku-5-5` unless a lesson needs otherwise (say so in its header).
- `ANTHROPIC_API_KEY` from git-ignored `.env`.
- Shared `lib/` and `test/` stay at the repo root. The backstop applies to every lesson.
- Code changes go on a feature branch and PR in this repo.
- Option names and signatures must be verified against the installed SDK types and current docs before each lesson is written.

## Approaches considered

| | Trade-off |
|---|---|
| **A. Separate `platform/` folder, `plat:NN` scripts, existing lessons moved to `guardrails/`** (chosen by John) | Clear split, room to grow. Moving the old lessons changes their relative imports and README paths. |
| B. Number new lessons 07 to 11 inside the existing tracks | No move, but leaves empty slots in whichever track a lesson does not belong to. |
| C. One folder, flat numbering | Simplest, but mixes guardrail lessons with unrelated features. |

## The parts John decided

- Approach A: `guardrails/` for existing lessons, `platform/` for all new ones.
- Order and topics of the five lessons.

## The parts decided on his behalf (his calls to correct)

- Existing script names stay `msg:NN` and `agent:NN`. Only the file paths behind them change.
- `lib/`, `test/`, `scripts/`, `decoy/` and `workspace/` stay at the repo root.
- Lesson 3 uses synthetic text (for example a made-up weekly note), never real john-os files.
- Lesson 4 runs the MCP server over stdio, started by the lesson itself, and adds `@modelcontextprotocol/sdk` as a dependency.
- Lesson 5 runs inside `workspace/` like the other Agent lessons, with `settingSources: []`.
- Lessons that are measure-and-compare (2) print the numbers; they have no unguarded/guarded flag.

## What is left to the builder

- Restructure steps: update relative imports, `package.json` scripts, tests, README and PLATFORM-LEARNING.md. All 66 existing tests and the typecheck must still pass after the move.
- Prompt caching: check the minimum cacheable prompt size for Haiku 5.5 first. If a short prompt cannot be cached, use a long synthetic document and say so in the lesson.
- Stop hook: verify the exact event input and return shape from the installed SDK types.
- Unit tests for any pure logic (for example the JSON validation in lesson 3). Lessons that only call the API are verified by running them.
- Run every lesson with a real key at least once and record what was seen in each "what you should see" note, plus a cost line in the README.
