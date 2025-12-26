/**
 * Production-safe Logger Utility
 * 
 * This logger wraps console methods to ensure they only execute in development mode.
 * In production builds (__DEV__ is false), only error logs will be output.
 * 
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.log('Debug message');
 *   logger.warn('Warning message');
 *   logger.error('Error message'); // Always logs
 */

export const logger = {
    /**
     * Log debug information (only in development)
     */
    log: (...args: any[]) => {
        if (__DEV__) {
            console.log(...args);
        }
    },

    /**
     * Log warnings (only in development)
     */
    warn: (...args: any[]) => {
        if (__DEV__) {
            console.warn(...args);
        }
    },

    /**
     * Log errors (always logs - useful for crash reporting)
     */
    error: (...args: any[]) => {
        // Always log errors, as they should be tracked in production too
        // In production, consider sending to a crash reporting service
        console.error(...args);
    },

    /**
     * Log with a custom prefix for easier filtering
     */
    debug: (prefix: string, ...args: any[]) => {
        if (__DEV__) {
            console.log(`[${prefix}]`, ...args);
        }
    },

    /**
     * Log API calls (only in development)
     */
    api: (method: string, url: string, data?: any) => {
        if (__DEV__) {
            console.log(`🌐 API ${method}: ${url}`, data ? data : '');
        }
    },

    /**
     * Log socket events (only in development)
     */
    socket: (event: string, data?: any) => {
        if (__DEV__) {
            console.log(`🔌 Socket ${event}:`, data ? data : '');
        }
    },
};

export default logger;
