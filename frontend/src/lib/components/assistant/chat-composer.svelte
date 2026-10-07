<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { MAX_CHAT_MESSAGE_LENGTH, shouldSubmitOnKey } from '$lib/assistant/chat.js';

	type Props = {
		value?: string;
		isGenerating: boolean;
		error?: string | null;
		onsend: () => void;
	};

	let { value = $bindable(''), isGenerating, error = null, onsend }: Props = $props();

	function submit(event: SubmitEvent) {
		event.preventDefault();
		onsend();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (shouldSubmitOnKey(event)) {
			event.preventDefault();
			onsend();
		}
	}
</script>

<form onsubmit={submit} class="composer">
	<label for="assistant-message">Message</label>
	<textarea
		id="assistant-message"
		bind:value
		onkeydown={handleKeydown}
		placeholder="Ask the ServiceFlow Assistant"
		maxlength={MAX_CHAT_MESSAGE_LENGTH}
		rows="3"
		disabled={isGenerating}
		aria-describedby="assistant-message-help assistant-message-error"
	></textarea>
	<div class="composer-footer">
		<p id="assistant-message-help">Enter to send. Shift+Enter adds a new line.</p>
		<span aria-live="polite">{value.trim().length}/{MAX_CHAT_MESSAGE_LENGTH}</span>
		<Button type="submit" disabled={isGenerating || !value.trim()}>
			{isGenerating ? 'Generating…' : 'Send'}
		</Button>
	</div>
	{#if error}
		<p id="assistant-message-error" class="error" role="alert">{error}</p>
	{/if}
</form>

<style>
	.composer { display: grid; gap: 0.55rem; }
	label { font-weight: 600; font-size: 0.9rem; }
	textarea {
		width: 100%;
		resize: vertical;
		min-height: 5.5rem;
		padding: 0.7rem;
		border: 1px solid var(--input);
		border-radius: var(--radius);
		background: transparent;
		color: inherit;
		font: inherit;
		line-height: 1.5;
	}
	textarea:focus-visible { outline: 3px solid color-mix(in oklch, var(--ring), transparent 50%); border-color: var(--ring); }
	.composer-footer { display: flex; align-items: center; gap: 0.75rem; }
	.composer-footer p { margin: 0; color: color-mix(in oklch, var(--foreground), transparent 35%); font-size: 0.8rem; }
	.composer-footer span { margin-left: auto; color: color-mix(in oklch, var(--foreground), transparent 35%); font-size: 0.8rem; }
	.error { margin: 0; color: var(--destructive); font-size: 0.9rem; }
	@media (max-width: 36rem) {
		.composer-footer { flex-wrap: wrap; }
		.composer-footer p { order: 3; width: 100%; }
	}
</style>
