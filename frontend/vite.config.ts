import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const keyPath = path.resolve('../certs/localhost-key.pem');
const certificatePath = path.resolve('../certs/localhost.pem');
const https =
	fs.existsSync(keyPath) && fs.existsSync(certificatePath)
		? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certificatePath) }
		: undefined;

export default defineConfig({
	envDir: '..',
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	server: {
		https,
		watch: {
			ignored: ['**/.svelte-kit/**']
		}
	}
});
