import assert from 'node:assert/strict';
import test from 'node:test';
import {
	MAX_CHAT_MESSAGE_LENGTH,
	canSubmitMessage,
	createChatMessage,
	removeMessage,
	replaceMessageContent,
	shouldSubmitOnKey,
	validateChatMessage
} from './chat.js';

test('validates empty and oversized messages', () => {
	assert.equal(validateChatMessage('   '), 'Enter a message before sending.');
	assert.equal(
		validateChatMessage('a'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1)),
		'Messages cannot exceed 2,000 characters.'
	);
	assert.equal(validateChatMessage('Hello'), null);
});

test('prevents duplicate submission while generation is active', () => {
	assert.equal(canSubmitMessage('Hello', false), true);
	assert.equal(canSubmitMessage('Hello', true), false);
});

test('updates a streaming placeholder and removes it when a request fails for retry', () => {
	const userMessage = createChatMessage('user', 'Hello');
	const assistantMessage = createChatMessage('assistant', '');
	const updated = replaceMessageContent([userMessage, assistantMessage], assistantMessage.id, 'Hello back');
	assert.equal(updated[1].content, 'Hello back');
	assert.deepEqual(removeMessage(updated, assistantMessage.id), [userMessage]);
});

test('submits with Enter but not Shift+Enter or while composing text', () => {
	assert.equal(shouldSubmitOnKey({ key: 'Enter', shiftKey: false, isComposing: false }), true);
	assert.equal(shouldSubmitOnKey({ key: 'Enter', shiftKey: true, isComposing: false }), false);
	assert.equal(shouldSubmitOnKey({ key: 'Enter', shiftKey: false, isComposing: true }), false);
});
