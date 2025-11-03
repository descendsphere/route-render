/**
 * A wrapper around the loglevel library to provide a consistent logging interface.
 * Assumes that loglevel has been loaded via a <script> tag and is available globally.
 * @example
 * import logger from './Logger.js';
 * logger.info('This is an info message.');
 * logger.warn('This is a warning.');
 * logger.error('This is an error.');
 */

// Set the default log level.
// This can be changed dynamically in the browser console, e.g., log.setLevel('debug');
log.setLevel('info');

const logger = {
  /**
   * Logs a message at the 'trace' level.
   * @param {...any} args - The message(s) to log.
   */
  trace: (...args) => log.trace(...args),

  /**
   * Logs a message at the 'debug' level.
   * @param {...any} args - The message(s) to log.
   */
  debug: (...args) => log.debug(...args),

  /**
   * Logs a message at the 'info' level.
   * @param {...any} args - The message(s) to log.
   */
  info: (...args) => log.info(...args),

  /**
   * Logs a message at the 'warn' level.
   * @param {...any} args - The message(s) to log.
   */
  warn: (...args) => log.warn(...args),

  /**
   * Logs a message at the 'error' level.
   * @param {...any} args - The message(s) to log.
   */
  error: (...args) => log.error(...args),

  /**
   * Sets the log level.
   * @param {string} level - The log level to set (e.g., 'trace', 'debug', 'info', 'warn', 'error').
   */
  setLevel: (level) => log.setLevel(level),
};

export default logger;
