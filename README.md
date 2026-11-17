# Claude Platform Learning

Hands-on lessons for building with the Claude platform, not just using the chat app or Claude Code. See [PLATFORM-LEARNING.md](PLATFORM-LEARNING.md) for the learning path and what is planned next.

## Guardrails lessons (Messages SDK and Agent SDK)

These lessons came first. They are a lab for guardrails on two Anthropic SDKs, built so you can break things on purpose:

- **Messages SDK** (`@anthropic-ai/sdk`): you write the loop, so guardrails are code you write.
- **Agent SDK** (`@anthropic-ai/claude-agent-sdk`): Claude Code as a library, so guardrails are options, hooks and callbacks you configure.

Design: [docs/sdk-guardrails-design.md](docs/sdk-guardrails-design.md) (written while this lived in the john-os repo, so some paths in it say `sandbox/`).

## Setup

```
npm install
copy .env.example .env      # then put your ANTHROPIC_API_KEY in .env (git-ignored)
npm test                    # unit tests for the guard logic, no API calls
```

Needs Node 24 or newer (it runs the `.ts` files directly, no build step).

## How a lesson works

Every lesson is one file you can read top to bottom. Its header comment says what it teaches and what you should see.

```
npm run msg:03                 # unguarded: watch it fail
npm run msg:03 -- --guarded    # same file, guardrail on
```

Open the file, find the line the `--guarded` flag switches, and edit it to break things further.

| # | Guardrail | Messages (`npm run msg:NN`) | Agent (`npm run agent:NN`) |
|---|---|---|---|
| 01 | Output cap / basics | `01-basics.ts`: `max_tokens` and `stop_reason` | `01-basics.ts`: one `query()` in a throwaway workspace |
| 02 | Turn limits | `02-loop-limits.ts`: max turns in a hand-written loop | `02-turn-limits.ts`: `maxTurns` |
| 03 | Spend cap | `03-spend-cap.ts`: budget from `usage` | `03-spend-cap.ts`: `maxBudgetUsd` |
| 04 | Tool control | `04-tool-allowlist.ts`: allowlist, validation, path jail | `04-tool-lists.ts`: `tools` / `allowedTools` / `disallowedTools` |
| 05 | Input/output checks | `05-io-checks.ts`: screening, redaction, injection | `05-hooks.ts`: `PreToolUse` hook |
| 06 | Human approval | `06-approval.ts`: yes/no prompt before a risky tool | `06-approval-jail.ts`: `canUseTool` + path jail |

## Where to go next

See [PLATFORM-LEARNING.md](PLATFORM-LEARNING.md) for a short path through the rest of the Claude platform (streaming, caching, structured output, MCP, hooks) and the guardrail-in-code vs. hook distinction.

## Safety and cost

- Every lesson uses `claude-haiku-5-5`. A full pass of all 24 runs cost well under a dollar when this was built (individual runs were fractions of a cent to about a cent).
- `lib/backstop.ts` is a safety net, not lesson content: it stops any Messages run at $0.25 or 30 calls, and caps every Agent run at 25 turns and $0.25, even in the deliberately broken versions.
- Agent lessons run inside `workspace/`, which is recreated before each run. The "break" demos only try to read `decoy/CANARY.txt`, never your real files.
- Agent lessons pass `settingSources: []` so your own `~/.claude` settings, hooks and CLAUDE.md do not change how they behave.
- Unguarded Agent lessons 04 to 06 pre-approve tools like Bash. They are safe here only because the task is tiny and the folder is throwaway. Do not copy that pattern into a real project.

## What these guardrails are not

They are in-process checks. They are not a security boundary: a shell command can do anything your user account can, symlinks and junctions can point outside a folder, and denylists are easy to get around. For anything that matters, add an allowlist of tools and real isolation (the Agent SDK `sandbox` option, a container, or a VM). Lessons 04 (Messages) and 06 (Agent) say this in their headers too.

## Handy commands

```
npm test                 # guard-logic unit tests
npm run typecheck        # tsc over every lesson
npm run reset            # recreate workspace/
```
