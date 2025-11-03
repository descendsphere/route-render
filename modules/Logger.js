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
  trace: (...args) => {
    const timestamp = new Date().toISOString();
    log.trace(timestamp, ...args);
  },

  /**
   * Logs a message at the 'debug' level.
   * @param {...any} args - The message(s) to log.
   */
  debug: (...args) => {
    const timestamp = new Date().toISOString();
    log.debug(timestamp, ...args);
  },

  /**
   * Logs a message at the 'info' level.
   * @param {...any} args - The message(s) to log.
   */
  info: (...args) => {
    const timestamp = new Date().toISOString();
    log.info(timestamp, ...args);
  },

  /**
   * Logs a message at the 'warn' level.
   * @param {...any} args - The message(s) to log.
   */
  warn: (...args) => {
    const timestamp = new Date().toISOString();
    log.warn(timestamp, ...args);
  },

  /**
   * Logs a message at the 'error' level.
   * @param {...any} args - The message(s) to log.
   */
  error: (...args) => {
    const timestamp = new Date().toISOString();
    log.error(timestamp, ...args);
  },

  /**
   * Sets the log level.
   * @param {string} level - The log level to set (e.g., 'trace', 'debug', 'info', 'warn', 'error').
   */
  setLevel: (level) => log.setLevel(level),
};

export default logger;
