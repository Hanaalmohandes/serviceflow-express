import { env } from '$env/dynamic/private';

export const API_URL = env.API_URL ?? 'https://localhost:3001';
