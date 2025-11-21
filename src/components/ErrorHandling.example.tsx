/**
 * Example integration of error handling components
 * This demonstrates how to use ErrorModal, ErrorNotification, and ErrorHandler
 */

import React, { useState, useEffect } from 'react';
import { ErrorModal, ErrorNotification } from './';
import { ErrorHandler } from '../utils';
import type { AppError } from '../types';
import { ErrorType } from '../types';

export const ErrorHandlingExample: React.FC = () => {
  const [connectionError, setConnectionError] = useState<AppError | null>(null);
  const [notificationError, setNotificationError] = useState<AppError | null>(null);

  // Register error callbacks on mount
  useEffect(() => {
    // Register callback for connection errors (shows modal)
    ErrorHandler.onConnectionError((error: AppError) => {
      setConnectionError(error);
    });

    // Register callback for notification errors (shows inline notification)
    ErrorHandler.onNotificationError((error: AppError) => {
      setNotificationError(error);
    });

    // Cleanup on unmount
    return () => {
      ErrorHandler.clearCallbacks();
    };
  }, []);

  // Example: Simulate connection error
  const simulateConnectionError = () => {
    const error = ErrorHandler.createError(
      ErrorType.CONNECTION_ERROR,
      'Failed to connect to Neo4j database. Please check your connection settings.',
      {
        uri: 'neo4j://172.52.50.179:7687',
        code: 'ServiceUnavailable',
      }
    );
    ErrorHandler.handle(error);
  };

  // Example: Simulate query error
  const simulateQueryError = () => {
    const error = ErrorHandler.createError(
      ErrorType.QUERY_ERROR,
      'Invalid Cypher syntax in query.',
      'Expected valid Cypher statement'
    );
    ErrorHandler.handle(error);
  };

  // Example: Simulate timeout error
  const simulateTimeoutError = () => {
    const error = ErrorHandler.createError(
      ErrorType.TIMEOUT_ERROR,
      'Query execution timed out after 30 seconds.',
      { timeout: 30000 }
    );
    ErrorHandler.handle(error);
  };

  // Example: Simulate GPT error
  const simulateGPTError = () => {
    const error = ErrorHandler.createError(
      ErrorType.GPT_ERROR,
      'Failed to generate Cypher query from natural language.',
      { statusCode: 429, message: 'Rate limit exceeded' }
    );
    ErrorHandler.handle(error);
  };

  // Retry connection handler
  const handleRetryConnection = () => {
    console.log('Retrying connection...');
    setConnectionError(null);
    // Add actual retry logic here
  };

  // Retry query handler
  const handleRetryQuery = () => {
    console.log('Retrying query...');
    setNotificationError(null);
    // Add actual retry logic here
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Error Handling Examples</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={simulateConnectionError}>
          Trigger Connection Error
        </button>
        <button onClick={simulateQueryError}>
          Trigger Query Error
        </button>
        <button onClick={simulateTimeoutError}>
          Trigger Timeout Error
        </button>
        <button onClick={simulateGPTError}>
          Trigger GPT Error
        </button>
      </div>

      {/* Error Modal for connection errors */}
      <ErrorModal
        error={connectionError}
        onClose={() => setConnectionError(null)}
        onRetry={handleRetryConnection}
      />

      {/* Error Notification for other errors */}
      <ErrorNotification
        error={notificationError}
        onClose={() => setNotificationError(null)}
        onRetry={handleRetryQuery}
        autoHideDuration={0} // Set to 5000 for 5 second auto-hide
      />
    </div>
  );
};

/**
 * Integration in App.tsx:
 * 
 * import { ErrorModal, ErrorNotification } from './components';
 * import { ErrorHandler } from './utils';
 * 
 * function App() {
 *   const [connectionError, setConnectionError] = useState<AppError | null>(null);
 *   const [notificationError, setNotificationError] = useState<AppError | null>(null);
 * 
 *   useEffect(() => {
 *     ErrorHandler.onConnectionError(setConnectionError);
 *     ErrorHandler.onNotificationError(setNotificationError);
 *     return () => ErrorHandler.clearCallbacks();
 *   }, []);
 * 
 *   // In your Neo4j connection code:
 *   try {
 *     await driver.verifyConnectivity();
 *   } catch (error) {
 *     const appError = ErrorHandler.createError(
 *       ErrorType.CONNECTION_ERROR,
 *       'Failed to connect to Neo4j database',
 *       error
 *     );
 *     ErrorHandler.handle(appError);
 *   }
 * 
 *   // In your query execution code:
 *   try {
 *     const result = await neo4jService.executeQuery(cypher);
 *   } catch (error) {
 *     const appError = ErrorHandler.createError(
 *       ErrorType.QUERY_ERROR,
 *       'Query execution failed',
 *       error
 *     );
 *     ErrorHandler.handle(appError);
 *   }
 * 
 *   return (
 *     <>
 *       <YourAppComponents />
 *       <ErrorModal 
 *         error={connectionError} 
 *         onClose={() => setConnectionError(null)}
 *         onRetry={handleRetryConnection}
 *       />
 *       <ErrorNotification 
 *         error={notificationError} 
 *         onClose={() => setNotificationError(null)}
 *       />
 *     </>
 *   );
 * }
 */
