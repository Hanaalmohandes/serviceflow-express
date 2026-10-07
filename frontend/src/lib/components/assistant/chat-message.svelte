<script lang="ts">
	import type { ChatMessage } from '$lib/assistant/chat.js';

	let { message, isGenerating = false }: { message: ChatMessage; isGenerating?: boolean } = $props();
	let label = $derived(message.role === 'user' ? 'You' : 'ServiceFlow Assistant');
</script>

<article class:from-user={message.role === 'user'} class:from-assistant={message.role === 'assistant'}>
	<p class="speaker">{label}</p>
	<div class="message-content" aria-live={message.role === 'assistant' ? 'polite' : undefined}>
		{#if message.content}
			{message.content}
		{:else if isGenerating}
			<span class="generating">Generating response</span>
		{/if}
	</div>
</article>

<style>
	article {
		max-width: min(46rem, 86%);
		padding: 0.8rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--card-foreground);
		box-shadow: 0 1px 2px rgb(51 41 31 / 6%);
	}

	.from-user {
		align-self: flex-end;
		background: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
	}

	.from-assistant {
		align-self: flex-start;
	}

	.speaker {
		margin: 0 0 0.35rem;
		font-size: 0.75rem;
		font-weight: 600;
		opacity: 0.78;
	}

	.message-content {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.55;
	}

	.generating::after {
		content: '…';
		animation: pulse 1.1s ease-in-out infinite;
	}

	@keyframes pulse {
		50% { opacity: 0.35; }
	}
</style>
