import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  generateAssistantResponse,
  streamAssistantResponse,
  type AssistantResponseGenerator,
  type AssistantStreamGenerator,
  AssistantValidationError,
  validateAssistantRequest
} from '../ai/assistant.js';
import { AssistantConfigurationError } from '../ai/config.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';
import { logger } from '../logger.js';

type AssistantRouteDependencies = Readonly<{
  generate: AssistantResponseGenerator;
  stream: AssistantStreamGenerator;
}>;

const defaultDependencies: AssistantRouteDependencies = {
  generate: generateAssistantResponse,
  stream: streamAssistantResponse
};

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}

function isClientAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function requestAbortSignal(req: Request, res: Response) {
  const controller = new AbortController();
  const abort = () => controller.abort(new DOMException('Client disconnected', 'AbortError'));
  req.once('aborted', abort);
  res.once('close', abort);

  return {
    signal: controller.signal,
    cleanup: () => {
      req.off('aborted', abort);
      res.off('close', abort);
    }
  };
}

function sendFailure(res: Response, error: unknown): void {
  if (error instanceof AssistantValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof AssistantConfigurationError) {
    res.status(503).json({ error: 'AI assistant is not configured' });
    return;
  }
  if (isTimeout(error)) {
    res.status(504).json({ error: 'AI assistant request timed out' });
    return;
  }
  res.status(502).json({ error: 'AI assistant request failed' });
}

export function createAssistantRouter(overrides: Partial<AssistantRouteDependencies> = {}) {
  const dependencies: AssistantRouteDependencies = { ...defaultDependencies, ...overrides };
  const router = Router();
  router.use(requireAuth);

  router.post('/', async (req, res) => {
    let parsed: { message: string; stream: boolean };
    try {
      parsed = validateAssistantRequest(req.body);
    } catch (error) {
      sendFailure(res, error);
      return;
    }

    const user = getAuthUser(req);
    const startedAt = performance.now();
    const requestSignal = requestAbortSignal(req, res);

    try {
      if (parsed.stream) {
        res.status(200);
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.set('Cache-Control', 'no-store');
        for await (const delta of dependencies.stream({ message: parsed.message, abortSignal: requestSignal.signal })) {
          if (requestSignal.signal.aborted) break;
          res.write(delta);
        }
        if (!res.writableEnded) res.end();
      } else {
        const text = await dependencies.generate({ message: parsed.message, abortSignal: requestSignal.signal });
        if (!requestSignal.signal.aborted) res.status(200).json({ text });
      }
      logger.info('assistant.request_succeeded', {
        actorId: user.userId,
        streamed: parsed.stream,
        durationMs: Math.round(performance.now() - startedAt)
      });
    } catch (error) {
      if (isClientAbort(error) || requestSignal.signal.reason instanceof DOMException && requestSignal.signal.reason.name === 'AbortError') {
        logger.info('assistant.request_aborted', { actorId: user.userId });
        return;
      }
      logger.warn('assistant.request_failed', {
        actorId: user.userId,
        reason: isTimeout(error) ? 'timeout' : error instanceof AssistantConfigurationError ? 'configuration' : 'gateway'
      });
      if (!res.headersSent) sendFailure(res, error);
      else if (!res.writableEnded) res.end();
    } finally {
      requestSignal.cleanup();
    }
  });

  return router;
}

export default createAssistantRouter();
