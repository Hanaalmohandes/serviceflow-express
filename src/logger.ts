import type { NextFunction, Request, Response } from 'express';

export type LogSeverity = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, string | number | boolean | undefined>;

function write(severity: LogSeverity, message: string, context: LogContext = {}) {
  const record = JSON.stringify({ timestamp: new Date().toISOString(), severity, message, ...context });
  if (severity === 'error') console.error(record);
  else if (severity === 'warn') console.warn(record);
  else console.log(record);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context)
};

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = performance.now();
  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - startedAt);
    const context = { method: req.method, path: req.path, status: res.statusCode, durationMs };
    if (res.statusCode >= 500) logger.error('http.request', context);
    else if (res.statusCode >= 400) logger.warn('http.request', context);
    else logger.info('http.request', context);
  });
  next();
}
