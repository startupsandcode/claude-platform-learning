// Display only: prints Agent SDK messages so each lesson file can stay about its guardrail.
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

export function logMessage(msg: SDKMessage): void {
  if (msg.type === "assistant") {
    for (const block of msg.message.content) {
      if (block.type === "text" && block.text.trim()) console.log(`assistant: ${block.text.trim()}`);
      if (block.type === "tool_use") console.log(`tool call: ${block.name} ${JSON.stringify(block.input).slice(0, 160)}`);
    }
  } else if (msg.type === "result") {
    console.log(`\nresult: subtype=${msg.subtype} turns=${msg.num_turns} cost=$${msg.total_cost_usd.toFixed(4)}`);
    if (msg.subtype === "success") console.log(`final answer: ${msg.result.trim()}`);
  }
}
