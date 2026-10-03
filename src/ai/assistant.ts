import { generateText, streamText } from 'ai';
import { createAiGateway } from 'ai-gateway-provider';
import { createUnified } from 'ai-gateway-provider/providers/unified';
import { getAssistantConfiguration } from './config.js';

export const MAX_ASSISTANT_MESSAGE_LENGTH = 2_000;

export type AssistantGenerationRequest = Readonly<{
  message: string;
  abortSignal: AbortSignal;
}>;

export type AssistantResponseGenerator = (request: AssistantGenerationRequest) => Promise<string>;
export type AssistantStreamGenerator = (request: AssistantGenerationRequest) => AsyncIterable<string>;

export class AssistantValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssistantValidationError';
  }
}

function hasMessage(value: unknown): value is { message: unknown; stream?: unknown } {
  return typeof value === 'object' && value !== null && 'message' in value;
}

export function validateAssistantRequest(value: unknown): { message: string; stream: boolean } {
  if (!hasMessage(value) || typeof value.message !== 'string') {
    throw new AssistantValidationError('message must be a string');
  }

  const message = value.message.trim();
  if (!message || message.length > MAX_ASSISTANT_MESSAGE_LENGTH) {
    throw new AssistantValidationError(`message must be between 1 and ${MAX_ASSISTANT_MESSAGE_LENGTH} characters`);
  }

  if (typeof value.stream !== 'undefined' && typeof value.stream !== 'boolean') {
    throw new AssistantValidationError('stream must be a boolean');
  }

  return { message, stream: value.stream === true };
}

function createAssistantModel() {
  const configuration = getAssistantConfiguration();
  const gateway = createAiGateway({
    accountId: configuration.accountId,
    gateway: configuration.gateway,
    apiKey: configuration.apiKey
  });
  const unified = createUnified();
  return { configuration, model: gateway(unified(configuration.model)) };
}

export const generateAssistantResponse: AssistantResponseGenerator = async ({ message, abortSignal }) => {
  const { configuration, model } = createAssistantModel();
  const result = await generateText({
    model,
    prompt: message,
    abortSignal,
    timeout: configuration.timeoutMs,
    maxOutputTokens: configuration.maxOutputTokens,
    maxRetries: 0
  });
  return result.text;
};

export const streamAssistantResponse: AssistantStreamGenerator = ({ message, abortSignal }) => {
  const { configuration, model } = createAssistantModel();
  return streamText({
    model,
    prompt: message,
    abortSignal,
    timeout: { totalMs: configuration.timeoutMs, chunkMs: configuration.timeoutMs },
    maxOutputTokens: configuration.maxOutputTokens,
    maxRetries: 0
  }).textStream;
};
