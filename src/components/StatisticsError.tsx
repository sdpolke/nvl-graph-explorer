import './StatisticsError.css';

interface StatisticsErrorProps {
  error: string;
  errorType?: 'connection' | 'timeout' | 'query' | 'general';
  onRetry: () => void;
  hasCachedData?: boolean;
  onUseCachedData?: () => void;
}

export const StatisticsError = ({
  error,
  errorType = 'general',
  onRetry,
  hasCachedData = false,
  onUseCachedData,
}: StatisticsErrorProps) => {
  const getErrorIcon = () => {
    switch (errorType) {
      case 'connection':
        return '🔌';
      case 'timeout':
        return '⏱️';
      case 'query':
        return '⚠️';
      default:
        return '❌';
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'connection':
        return 'Connection Error';
      case 'timeout':
        return 'Query Timeout';
      case 'query':
        return 'Query Error';
      default:
        return 'Error';
    }
  };

  const getHelpText = () => {
    switch (errorType) {
      case 'connection':
        return 'Please check your database connection and try again.';
      case 'timeout':
        return 'The query took too long to complete. The database may be under heavy load.';
      case 'query':
        return 'There was an error executing the query. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <div 
      className="statistics-error"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="error-content">
        <div className="error-icon" aria-hidden="true">{getErrorIcon()}</div>
        <h3 className="error-title" id="error-title">{getErrorTitle()}</h3>
        <p className="error-message" id="error-message">{error}</p>
        <p className="error-help" id="error-help">{getHelpText()}</p>
        
        <div 
          className="error-actions"
          role="group"
          aria-label="Error recovery actions"
        >
          <button 
            className="retry-button" 
            onClick={onRetry}
            aria-label="Retry loading statistics"
            type="button"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            Retry
          </button>
          
          {hasCachedData && onUseCachedData && (
            <button 
              className="cached-data-button" 
              onClick={onUseCachedData}
              aria-label="Use previously cached statistics data"
              type="button"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Use Cached Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
