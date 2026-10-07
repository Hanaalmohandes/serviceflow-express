export const MAX_CHAT_MESSAGE_LENGTH = 2_000;

export type ChatMessage = Readonly<{
	id: string;
	role: 'user' | 'assistant';
	content: string;
}>;

export function validateChatMessage(value: string): string | null {
	const message = value.trim();
	if (!message) return 'Enter a message before sending.';
	if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
		return `Messages cannot exceed ${MAX_CHAT_MESSAGE_LENGTH.toLocaleString()} characters.`;
	}
	return null;
}

export function canSubmitMessage(value: string, isGenerating: boolean): boolean {
	return !isGenerating && validateChatMessage(value) === null;
}

export function createChatMessage(role: ChatMessage['role'], content: string): ChatMessage {
	return { id: crypto.randomUUID(), role, content };
}

export function replaceMessageContent(messages: ChatMessage[], id: string, content: string): ChatMessage[] {
	return messages.map((message) => (message.id === id ? { ...message, content } : message));
}

export function removeMessage(messages: ChatMessage[], id: string): ChatMessage[] {
	return messages.filter((message) => message.id !== id);
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

export function shouldSubmitOnKey(event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'isComposing'>): boolean {
	return event.key === 'Enter' && !event.shiftKey && !event.isComposing;
}
