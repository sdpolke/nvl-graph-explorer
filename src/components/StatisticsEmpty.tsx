import './StatisticsEmpty.css';

interface StatisticsEmptyProps {
  title?: string;
  message?: string;
  suggestion?: string;
}

export const StatisticsEmpty = ({
  title = 'No Data Available',
  message = 'The database appears to be empty.',
  suggestion = 'Add some nodes to your Neo4j database to see statistics here.',
}: StatisticsEmptyProps) => {
  return (
    <div className="statistics-empty">
      <div className="empty-content">
        <div className="empty-icon">📊</div>
        <h3 className="empty-title">{title}</h3>
        <p className="empty-message">{message}</p>
        <p className="empty-suggestion">{suggestion}</p>
      </div>
    </div>
  );
};
