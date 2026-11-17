// SAFETY NET, NOT LESSON CONTENT. Every Messages lesson, guarded or not, records its
// usage here so a deliberately broken run can never spend more than a few cents.
import { costUsd, type Usage } from "./pricing.ts";

export class BackstopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackstopError";
  }
}

export function createBackstop(opts: { maxUsd?: number; maxCalls?: number } = {}) {
  const maxUsd = opts.maxUsd ?? 0.25;
  const maxCalls = opts.maxCalls ?? 30;
  let spent = 0;
  let calls = 0;
  return {
    record(usage: Usage): void {
      calls += 1;
      spent += costUsd(usage);
      if (calls > maxCalls) throw new BackstopError(`backstop: more than ${maxCalls} model calls`);
      if (spent > maxUsd) throw new BackstopError(`backstop: spent $${spent.toFixed(4)}, over the $${maxUsd} limit`);
    },
  };
}

// Same idea for Agent SDK lessons: spread these into every query() options object.
export const AGENT_BACKSTOP = { maxBudgetUsd: 0.25, maxTurns: 25 } as const;

// Lessons call this so a trip prints one clear line and exits non-zero (no stack trace).
export function exitOnError(err: unknown): never {
  console.error(`\n${err instanceof Error ? err.name + ": " + err.message : String(err)}`);
  process.exit(1);
}
