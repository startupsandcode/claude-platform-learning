# Learning the Claude Platform

A short path for going from "I use Claude" to "I build with the Claude platform", using this repo as the practice ground.

Check current model names, prices, and feature availability in the official docs before relying on anything here. They change.

## The mental model

There are three layers, and this repo already touches two of them.

1. **Messages API** is the foundation. You send messages and get a reply. Everything else is built on it. Chat apps and Claude Code are products made from this.
2. **Your own loop on top of it.** You add tools, memory, and guardrails yourself. This is what `messages/` teaches.
3. **Agent SDK** is Claude Code as a library. The loop, built-in tools, and hooks come ready-made. This is what `agent/` teaches.

Chat and Claude Code are finished products. The platform is the set of parts you build your own products from.

## The path

### 1. Messages basics (done: lessons 01 to 03)

Learn `max_tokens`, `stop_reason`, `usage`, and the system prompt. The key idea is that every call is stateless: you resend the whole conversation each time.

### 2. Tool use (done: lessons 04 to 06)

The model never runs anything. It returns a request like "call this tool with these inputs", your code runs it, and you send the result back. Once that clicks, agents stop feeling magic.

### 3. Features worth learning next

Roughly in order of payoff:

- **Streaming**: show output as it arrives.
- **Prompt caching**: large cost and latency savings when you resend long, repeated context.
- **Structured outputs**: get reliable JSON instead of parsing prose.
- **Batch API**: cheaper bulk jobs that do not need an immediate answer.
- **Files, vision, and PDFs**: feed documents and images in.
- **Extended thinking**: give the model reasoning room on harder tasks.

### 4. MCP (Model Context Protocol)

A standard way to plug tools and data sources into any Claude app. The Gmail, Calendar, and Drive connectors are MCP servers. A good exercise is writing a tiny one yourself.

### 5. Agent SDK in depth

Hooks, permissions, subagents, sessions, and skills. Revisit after step 2, when you know what the SDK saves you from writing.

Hook events available in the installed SDK version (from the `HookEvent` type in `node_modules/@anthropic-ai/claude-agent-sdk`):

| Group | Events |
|---|---|
| Tool calls | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` |
| Permissions | `PermissionRequest`, `PermissionDenied` |
| Prompts and turns | `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `StopFailure` |
| Session lifecycle | `SessionStart`, `SessionEnd`, `Setup`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `DirectoryAdded` |
| Context and model | `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch` |
| Subagents, tasks, teams | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle` |
| Other | `Notification`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove`, `MessageDisplay` |

For guardrails, the main ones are `PreToolUse` (block or rewrite a call), `UserPromptSubmit` (screen input), `PostToolUse` (check output), `Stop` (enforce "not done until X"), and `PermissionRequest` (approval). Only the event names were checked. Read each event's input and return type before writing a hook.

### 6. Evaluating and operating

Write small test cases for prompts, track cost with `usage`, and pick models by task: smaller models for cheap, high-volume work, larger ones for hard reasoning.

## Guardrail in your code vs. a hook

The difference is who owns the loop.

- **Messages SDK**: you write the loop, so a guardrail is an `if` in your code. You control every step, but you build everything, including the tools, the allowlist, and the path jail.
- **Agent SDK**: Claude Code runs the loop, so you register a callback (a hook) for an event. What it returns decides what happens: allow, deny, or change the input. It works on built-in tools you did not write, but it only sees what the SDK exposes, so your matching logic has to anticipate every phrasing of the same action. This is why agent lesson 05 needed hardening for PowerShell.
- **Declarative options** (`maxTurns`, `maxBudgetUsd`, `disallowedTools`) are enough for fixed rules. Use hooks and `canUseTool` when the rule depends on the content of the call.

None of these is a security boundary. They run in-process. For anything that matters, add real isolation (the Agent SDK `sandbox` option, a container, or a VM).

## How to learn it

- **Break things on purpose.** The guarded and unguarded runs exist for this.
- **One small feature per sitting.** Add one lesson file, run it, read the raw response JSON, and write down what surprised you.
- **Read the response object, not just the text.** `usage`, `stop_reason`, and content blocks explain most of the behavior.
- **Keep a real project in mind.** A john-os use is the best motivator, for example a script that drafts the weekly review through the API with a budget cap.

## Suggested next lessons

1. Streaming
2. Prompt caching (measure the cost difference)
3. Structured output for a john-os task
4. A small MCP server
5. A `Stop` hook in the Agent SDK

## Links

Not fetched when this file was written, so a link may have moved.

- Agent SDK docs: https://docs.claude.com/en/api/agent-sdk/overview
- Agent SDK on npm: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- Agent SDK TypeScript repo: https://github.com/anthropics/claude-agent-sdk-typescript
- Agent SDK Python repo: https://github.com/anthropics/claude-agent-sdk-python
- API docs: https://docs.claude.com/en/api/overview
- Messages SDK on npm: https://www.npmjs.com/package/@anthropic-ai/sdk
- Messages SDK TypeScript repo: https://github.com/anthropics/anthropic-sdk-typescript
- Messages SDK Python repo: https://github.com/anthropics/anthropic-sdk-python

The exact types for the installed versions are in `node_modules/@anthropic-ai/claude-agent-sdk/` and `node_modules/@anthropic-ai/sdk/`.
