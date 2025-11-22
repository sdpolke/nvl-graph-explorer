/**
 * Environment configuration for the application
 * Centralizes access to environment variables
 */

export const config = {
  proxyUrl: import.meta.env.VITE_PROXY_URL || 'http://localhost:3001',
} as const;
