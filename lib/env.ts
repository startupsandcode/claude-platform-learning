export function requireApiKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is missing. Copy .env.example to .env and put your key in it.");
  }
  return key;
}
