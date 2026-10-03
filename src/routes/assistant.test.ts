import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import { signAccessToken } from '../auth.js';
import type { AssistantGenerationRequest } from '../ai/assistant.js';
import { createAssistantRouter } from './assistant.js';

process.env.JWT_ACCESS_SECRET = 'assistant-test-access-secret';

type ServerHandle = Readonly<{
  baseUrl: string;
  close: () => Promise<void>;
}>;

async function startAssistantServer(options: {
  generate?: (request: AssistantGenerationRequest) => Promise<string>;
  stream?: (request: AssistantGenerationRequest) => AsyncIterable<string>;
} = {}): Promise<ServerHandle> {
  const app = express();
  app.use(express.json());
  app.use('/assistant', createAssistantRouter(options));
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not provide a TCP address');

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, 'close');
    }
  };
}

function accessToken(): string {
  return signAccessToken({ userId: 'test-user', isHost: false, tenantId: 'tenant-1', departmentId: 'department-1', role: 'Employee' });
}

test('accepts an authenticated valid request without calling a real model', async () => {
  const server = await startAssistantServer({ generate: async ({ message }) => `Echo: ${message}` });
  try {
    const response = await fetch(`${server.baseUrl}/assistant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: 'Echo: Hello' });
  } finally {
    await server.close();
  }
});

test('rejects an invalid assistant request', async () => {
  const server = await startAssistantServer();
  try {
    const response = await fetch(`${server.baseUrl}/assistant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' })
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'message must be between 1 and 2000 characters' });
  } finally {
    await server.close();
  }
});

test('rejects an unauthenticated assistant request', async () => {
  const server = await startAssistantServer();
  try {
    const response = await fetch(`${server.baseUrl}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' })
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Missing token' });
  } finally {
    await server.close();
  }
});

test('returns a gateway failure without exposing provider details', async () => {
  const server = await startAssistantServer({ generate: async () => { throw new Error('provider credential leaked'); } });
  try {
    const response = await fetch(`${server.baseUrl}/assistant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' })
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'AI assistant request failed' });
  } finally {
    await server.close();
  }
});

test('returns a timeout failure', async () => {
  const timeoutError = new Error('Timed out');
  timeoutError.name = 'TimeoutError';
  const server = await startAssistantServer({ generate: async () => { throw timeoutError; } });
  try {
    const response = await fetch(`${server.baseUrl}/assistant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' })
    });
    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), { error: 'AI assistant request timed out' });
  } finally {
    await server.close();
  }
});

test('streams a response when requested', async () => {
  async function* stream(): AsyncIterable<string> {
    yield 'Hello';
    yield ' from ServiceFlow';
  }

  const server = await startAssistantServer({ stream });
  try {
    const response = await fetch(`${server.baseUrl}/assistant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello', stream: true })
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await response.text(), 'Hello from ServiceFlow');
  } finally {
    await server.close();
  }
});
