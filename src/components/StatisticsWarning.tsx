import './StatisticsWarning.css';

interface StatisticsWarningProps {
  message: string;
  failedItems?: string[];
  onDismiss?: () => void;
}

export const StatisticsWarning = ({
  message,
  failedItems = [],
  onDismiss,
}: StatisticsWarningProps) => {
  return (
    <div className="statistics-warning">
      <div className="warning-icon">⚠️</div>
      <div className="warning-content">
        <div className="warning-message">{message}</div>
        {failedItems.length > 0 && (
          <div className="warning-details">
            Failed to load: {failedItems.join(', ')}
          </div>
        )}
      </div>
      {onDismiss && (
        <button className="warning-dismiss" onClick={onDismiss} aria-label="Dismiss warning">
          ×
        </button>
      )}
    </div>
  );
};
