/**
 * ErrorHandler utility class for routing and managing application errors
 */

import type { AppError } from '../types';
import { ErrorType } from '../types';

export type ErrorCallback = (error: AppError) => void;

export class ErrorHandler {
  private static connectionErrorCallback: ErrorCallback | null = null;
  private static notificationErrorCallback: ErrorCallback | null = null;

  /**
   * Register callback for connection errors (displays modal)
   */
  static onConnectionError(callback: ErrorCallback): void {
    this.connectionErrorCallback = callback;
  }

  /**
   * Register callback for notification errors (displays inline notification)
   */
  static onNotificationError(callback: ErrorCallback): void {
    this.notificationErrorCallback = callback;
  }

  /**
   * Main error handling method that routes errors to appropriate handlers
   */
  static handle(error: AppError): void {
    switch (error.type) {
      case ErrorType.CONNECTION_ERROR:
        this.handleConnectionError(error);
        break;
      
      case ErrorType.QUERY_ERROR:
      case ErrorType.TIMEOUT_ERROR:
      case ErrorType.GPT_ERROR:
      case ErrorType.VALIDATION_ERROR:
        this.handleNotificationError(error);
        break;
      
      default:
        this.handleGenericError(error);
    }
  }

  /**
   * Handle connection errors by showing modal
   */
  private static handleConnectionError(error: AppError): void {
    if (this.connectionErrorCallback) {
      this.connectionErrorCallback(error);
    } else {
      console.error('Connection Error:', error);
    }
  }

  /**
   * Handle notification errors by showing inline notification
   */
  private static handleNotificationError(error: AppError): void {
    if (this.notificationErrorCallback) {
      this.notificationErrorCallback(error);
    } else {
      console.error('Error:', error);
    }
  }

  /**
   * Handle generic errors
   */
  private static handleGenericError(error: AppError): void {
    console.error('Unhandled Error:', error);
    if (this.notificationErrorCallback) {
      this.notificationErrorCallback(error);
    }
  }

  /**
   * Create a standardized error object
   */
  static createError(type: ErrorType, message: string, details?: any): AppError {
    return {
      type,
      message,
      details,
    };
  }

  /**
   * Clear all registered callbacks
   */
  static clearCallbacks(): void {
    this.connectionErrorCallback = null;
    this.notificationErrorCallback = null;
  }
}
