import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	server: {
		https: {
			key: fs.readFileSync(path.resolve('../certs/localhost-key.pem')),
			cert: fs.readFileSync(path.resolve('../certs/localhost.pem'))
		},
		// SvelteKit rewrites this generated folder during route type generation.
		// Keeping it out of Vite's watcher prevents transient ENOENT reload errors.
		watch: {
			ignored: ['**/.svelte-kit/**']
		}
	}
});
