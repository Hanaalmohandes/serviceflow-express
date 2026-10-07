<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import ChatComposer from '$lib/components/assistant/chat-composer.svelte';
	import AssistantMessage from '$lib/components/assistant/chat-message.svelte';
	import {
		createChatMessage,
		isAbortError,
		removeMessage,
		replaceMessageContent,
		validateChatMessage,
		type ChatMessage
	} from '$lib/assistant/chat.js';

	let messages = $state<ChatMessage[]>([]);
	let draft = $state('');
	let isGenerating = $state(false);
	let inputError = $state<string | null>(null);
	let requestError = $state<string | null>(null);
	let lastFailedMessage = $state<string | null>(null);
	let messageList = $state<HTMLDivElement>();
	let requestController: AbortController | null = null;
	onDestroy(() => requestController?.abort());

	$effect(() => {
		messages.length;
		isGenerating;
		void tick().then(() => messageList?.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' }));
	});

	async function send(message = draft, includeUserMessage = true) {
		if (isGenerating) return;
		const validationError = validateChatMessage(message);
		if (validationError) {
			inputError = validationError;
			return;
		}

		const content = message.trim();
		inputError = null;
		requestError = null;
		lastFailedMessage = null;
		if (includeUserMessage) messages = [...messages, createChatMessage('user', content)];
		draft = '';
		const assistantMessage = createChatMessage('assistant', '');
		messages = [...messages, assistantMessage];
		isGenerating = true;
		requestController = new AbortController();

		try {
			const response = await fetch('/assistant', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: content, stream: true }),
				signal: requestController.signal
			});
			if (!response.ok || !response.body) throw new Error('Assistant request failed');

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let received = '';
			while (true) {
				const chunk = await reader.read();
				if (chunk.done) break;
				received += decoder.decode(chunk.value, { stream: true });
				messages = replaceMessageContent(messages, assistantMessage.id, received);
			}
			received += decoder.decode();
			messages = replaceMessageContent(messages, assistantMessage.id, received);
		} catch (error) {
			messages = removeMessage(messages, assistantMessage.id);
			if (!isAbortError(error)) {
				lastFailedMessage = content;
				requestError = 'The assistant could not respond. Your message was not lost; try again.';
			}
		} finally {
			isGenerating = false;
			requestController = null;
		}
	}

	function retry() {
		if (lastFailedMessage) void send(lastFailedMessage, false);
	}
</script>

<svelte:head><title>AI Assistant | ServiceFlow</title></svelte:head>

<main class="page">
	<Card class="chat-card">
		<CardHeader>
			<CardTitle>ServiceFlow Assistant</CardTitle>
			<CardDescription>Ask a question and receive a streamed response. The assistant does not access ServiceFlow data.</CardDescription>
		</CardHeader>
		<CardContent class="chat-content">
			<div class="messages" bind:this={messageList} aria-label="Conversation" aria-busy={isGenerating}>
				{#if messages.length === 0}
					<div class="empty-state">
						<h1>How can I help?</h1>
						<p>Start a conversation with the ServiceFlow Assistant.</p>
					</div>
				{:else}
					{#each messages as message (message.id)}
						<AssistantMessage {message} isGenerating={isGenerating && message.role === 'assistant'} />
					{/each}
				{/if}
			</div>

			{#if requestError}
				<div class="request-error" role="alert">
					<p>{requestError}</p>
					<Button variant="outline" size="sm" onclick={retry} disabled={!lastFailedMessage || isGenerating}>Retry</Button>
				</div>
			{/if}

			<ChatComposer bind:value={draft} {isGenerating} error={inputError} onsend={() => void send()} />
		</CardContent>
	</Card>
</main>

<style>
	.page { max-width: 58rem; margin: 2.5rem auto; padding: 0 1rem; }
	:global(.chat-card) { min-height: min(44rem, calc(100vh - 9rem)); }
	:global(.chat-content) { display: grid; min-height: 0; flex: 1; grid-template-rows: minmax(16rem, 1fr) auto auto; gap: 1rem; }
	.messages { display: flex; min-height: 16rem; max-height: 29rem; flex-direction: column; gap: 0.75rem; overflow-y: auto; padding: 0.25rem; scroll-behavior: smooth; }
	.empty-state { display: grid; place-content: center; flex: 1; text-align: center; color: color-mix(in oklch, var(--foreground), transparent 30%); }
	.empty-state h1 { margin: 0; font-size: 1.35rem; color: var(--foreground); }
	.empty-state p { margin: 0.4rem 0 0; }
	.request-error { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem; border: 1px solid color-mix(in oklch, var(--destructive), transparent 60%); border-radius: var(--radius); background: color-mix(in oklch, var(--destructive), transparent 93%); color: var(--destructive); }
	.request-error p { margin: 0; }
	@media (max-width: 36rem) {
		.page { margin: 1rem auto; padding: 0 0.65rem; }
		:global(.chat-card) { min-height: calc(100vh - 6rem); }
		.messages { max-height: none; }
		.request-error { align-items: flex-start; flex-direction: column; }
	}
</style>
