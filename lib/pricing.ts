// Shared by every Messages lesson. Haiku 5.5 list price (prompts up to 100K tokens).
export const MODEL = "claude-haiku-5-5";

const INPUT_USD_PER_MTOK = 0.1;
const OUTPUT_USD_PER_MTOK = 0.5;

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export function costUsd(usage: Usage): number {
  return (usage.input_tokens * INPUT_USD_PER_MTOK + usage.output_tokens * OUTPUT_USD_PER_MTOK) / 1_000_000;
}
