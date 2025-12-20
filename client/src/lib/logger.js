// src/lib/logger.js

const isDev = import.meta.env.DEV;

/**
 * Standard Logger to abstract console usage.
 * In the future, we can hook this into Sentry/LogRocket for production.
 */
export const logger = {
  info: (message, ...args) => {
    if (isDev) {
      console.log(`%c[INFO] ${message}`, 'color: #3b82f6', ...args);
    }
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message, error) => {
    // Always log errors, even in prod, but formatted cleanly
    console.error(`[ERROR] ${message}`, error);
    
    // TODO: Add Sentry capture here
    // if (!isDev) Sentry.captureException(error);
  }
};