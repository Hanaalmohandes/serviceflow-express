export type AssistantConfiguration = Readonly<{
  accountId: string;
  gateway: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
}>;

export class AssistantConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssistantConfigurationError';
  }
}

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new AssistantConfigurationError(`${name} is not configured`);
  return value;
}

function positiveInteger(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new AssistantConfigurationError(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

export function getAssistantConfiguration(): AssistantConfiguration {
  return {
    accountId: requiredEnvironmentValue('CLOUDFLARE_ACCOUNT_ID'),
    gateway: requiredEnvironmentValue('CLOUDFLARE_AI_GATEWAY'),
    apiKey: requiredEnvironmentValue('CLOUDFLARE_AI_GATEWAY_TOKEN'),
    model: process.env.SERVICEFLOW_AI_MODEL?.trim() || 'openai/gpt-4.1-mini',
    timeoutMs: positiveInteger('SERVICEFLOW_AI_TIMEOUT_MS', 30_000, 120_000),
    maxOutputTokens: positiveInteger('SERVICEFLOW_AI_MAX_OUTPUT_TOKENS', 512, 2_048)
  };
}
