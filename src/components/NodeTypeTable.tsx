import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { List } from 'react-window';
import type { NodeStatistic, RelationshipStatistic } from '../types';
import { debounce } from '../utils';
import './NodeTypeTable.css';

interface NodeTypeTableProps {
  nodeStats: NodeStatistic[];
  relationshipStats: Map<string, RelationshipStatistic[]>;
  expandedNodeTypes: Set<string>;
  onNodeTypeExpand: (nodeType: string) => void;
  isLoading: boolean;
}

type SortColumn = 'name' | 'count';
type SortDirection = 'asc' | 'desc';

const ROW_HEIGHT = 48;
const EXPANDED_ROW_HEIGHT = 200;
const TABLE_HEIGHT = 600;

export const NodeTypeTable = ({
  nodeStats,
  relationshipStats,
  expandedNodeTypes,
  onNodeTypeExpand,
}: NodeTypeTableProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pendingSortColumn, setPendingSortColumn] = useState<SortColumn>('count');
  const [pendingSortDirection, setPendingSortDirection] = useState<SortDirection>('desc');

  const debouncedApplySort = useRef(
    debounce((column: SortColumn, direction: SortDirection) => {
      setSortColumn(column);
      setSortDirection(direction);
    }, 300)
  ).current;

  useEffect(() => {
    return () => {
      // Cleanup on unmount
    };
  }, []);

  const sortedStats = useMemo(() => {
    const sorted = [...nodeStats];
    sorted.sort((a, b) => {
      const aVal = sortColumn === 'name' ? a.label : a.count;
      const bVal = sortColumn === 'name' ? b.label : b.count;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [nodeStats, sortColumn, sortDirection]);

  const handleSort = useCallback((column: SortColumn) => {
    let newDirection: SortDirection;
    
    if (pendingSortColumn === column) {
      newDirection = pendingSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newDirection = column === 'count' ? 'desc' : 'asc';
    }
    
    setPendingSortColumn(column);
    setPendingSortDirection(newDirection);
    debouncedApplySort(column, newDirection);
  }, [pendingSortColumn, pendingSortDirection, debouncedApplySort]);

  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  }, []);

  const getRowHeight = useCallback((index: number) => {
    const stat = sortedStats[index];
    return expandedNodeTypes.has(stat.label) ? EXPANDED_ROW_HEIGHT : ROW_HEIGHT;
  }, [sortedStats, expandedNodeTypes]);

  const RowComponent = ({ index, style }: any) => {
    const stat = sortedStats[index];
    const isExpanded = expandedNodeTypes.has(stat.label);
    const relStats = relationshipStats.get(stat.label);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNodeTypeExpand(stat.label);
      }
    };

    return (
      <div style={style}>
        <div
          className={`table-row ${isExpanded ? 'expanded' : ''}`}
          onClick={() => onNodeTypeExpand(stat.label)}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`${stat.label}, ${formatNumber(stat.count)} nodes. ${isExpanded ? 'Expanded' : 'Collapsed'}. Press Enter or Space to ${isExpanded ? 'collapse' : 'expand'}.`}
        >
          <div className="row-content">
            <div 
              className="color-indicator" 
              style={{ backgroundColor: stat.color }}
              aria-hidden="true"
            />
            <div className="node-type-name">{stat.label}</div>
            <div className="node-count" aria-label={`${stat.count.toLocaleString()} nodes`}>
              {formatNumber(stat.count)}
            </div>
            <div className="expand-icon" aria-hidden="true">
              {isExpanded ? '▼' : '▶'}
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div 
            className="expanded-content"
            role="region"
            aria-label={`Relationship details for ${stat.label}`}
            aria-live="polite"
          >
            {!relStats && (
              <div className="loading-spinner" role="status" aria-label="Loading relationships">
                Loading relationships...
              </div>
            )}
            {relStats && relStats.length === 0 && (
              <div className="no-relationships" role="status">
                No relationships found
              </div>
            )}
            {relStats && relStats.length > 0 && (
              <div className="relationship-list" role="list" aria-label="Relationships">
                {relStats[0].isSampled && (
                  <div 
                    className="sampling-badge"
                    role="note"
                    aria-label={`Based on sample of ${relStats[0].sampleSize?.toLocaleString()} nodes`}
                  >
                    ⓘ Based on sample of {relStats[0].sampleSize?.toLocaleString()} nodes
                  </div>
                )}
                {relStats.map((rel, idx) => (
                  <div 
                    key={idx} 
                    className="relationship-item"
                    role="listitem"
                    aria-label={`${rel.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} relationship ${rel.type} to ${rel.connectedNodeTypes.join(', ')}, ${formatNumber(rel.count)} connections`}
                  >
                    <span className="rel-direction" aria-hidden="true">
                      {rel.direction === 'outgoing' ? '→' : '←'}
                    </span>
                    <span className="rel-type">{rel.type}</span>
                    <span className="rel-arrow" aria-hidden="true">
                      {rel.direction === 'outgoing' ? '→' : '←'}
                    </span>
                    <span className="rel-connected">
                      {rel.connectedNodeTypes.join(', ')}
                    </span>
                    <span className="rel-count">({formatNumber(rel.count)})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleSortKeyDown = (e: React.KeyboardEvent, column: SortColumn) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(column);
    }
  };

  return (
    <div 
      className="node-type-table"
      role="region"
      aria-label="Node type statistics table"
    >
      <div className="table-header" role="rowgroup">
        <div className="header-row" role="row">
          <div className="color-column" role="columnheader" aria-label="Color indicator" />
          <div 
            className={`name-column sortable ${pendingSortColumn === 'name' ? 'active' : ''}`}
            onClick={() => handleSort('name')}
            onKeyDown={(e) => handleSortKeyDown(e, 'name')}
            role="columnheader"
            tabIndex={0}
            aria-sort={pendingSortColumn === 'name' ? (pendingSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            aria-label={`Node Type, sortable column, currently ${pendingSortColumn === 'name' ? `sorted ${pendingSortDirection === 'asc' ? 'ascending' : 'descending'}` : 'not sorted'}`}
          >
            Node Type
            {pendingSortColumn === 'name' && (
              <span className="sort-indicator" aria-hidden="true">
                {pendingSortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div 
            className={`count-column sortable ${pendingSortColumn === 'count' ? 'active' : ''}`}
            onClick={() => handleSort('count')}
            onKeyDown={(e) => handleSortKeyDown(e, 'count')}
            role="columnheader"
            tabIndex={0}
            aria-sort={pendingSortColumn === 'count' ? (pendingSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            aria-label={`Count, sortable column, currently ${pendingSortColumn === 'count' ? `sorted ${pendingSortDirection === 'asc' ? 'ascending' : 'descending'}` : 'not sorted'}`}
          >
            Count
            {pendingSortColumn === 'count' && (
              <span className="sort-indicator" aria-hidden="true">
                {pendingSortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="expand-column" role="columnheader" aria-label="Expand control" />
        </div>
      </div>
      
      <div 
        role="rowgroup"
        aria-label={`${sortedStats.length} node types`}
      >
        <List
          rowComponent={RowComponent}
          rowCount={sortedStats.length}
          rowHeight={getRowHeight}
          rowProps={{}}
          defaultHeight={TABLE_HEIGHT}
        />
      </div>
    </div>
  );
};
