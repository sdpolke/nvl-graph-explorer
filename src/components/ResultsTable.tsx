import React, { useState, useMemo } from 'react';
import type { Node } from '../types';
import './ResultsTable.css';

export interface ResultsTableProps {
  nodes: Node[];
  maxRows?: number;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface TableRow {
  id: string;
  labels: string;
  [key: string]: any;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ nodes, maxRows = 50 }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });

  // Extract all unique property keys from nodes
  const columns = useMemo(() => {
    const propertyKeys = new Set<string>();
    propertyKeys.add('id');
    propertyKeys.add('labels');
    
    nodes.forEach(node => {
      Object.keys(node.properties).forEach(key => propertyKeys.add(key));
    });
    
    return Array.from(propertyKeys);
  }, [nodes]);

  // Prepare table data
  const tableData = useMemo((): TableRow[] => {
    return nodes.map(node => ({
      id: node.id,
      labels: node.labels.join(', '),
      ...node.properties,
    }));
  }, [nodes]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return tableData;
    }

    const sorted = [...tableData].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Convert to string for comparison
      const aStr = String(aValue);
      const bStr = String(bValue);
      return sortConfig.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [tableData, sortConfig]);

  // Limit displayed rows
  const displayedData = sortedData.slice(0, maxRows);
  const totalCount = nodes.length;
  const displayedCount = displayedData.length;

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.column === column) {
        // Cycle through: asc -> desc -> null
        if (prevConfig.direction === 'asc') {
          return { column, direction: 'desc' };
        } else if (prevConfig.direction === 'desc') {
          return { column: '', direction: null };
        }
      }
      return { column, direction: 'asc' };
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;

    // Create CSV header
    const csvHeader = columns.join(',');

    // Create CSV rows
    const csvRows = sortedData.map(row => {
      return columns.map(column => {
        const value = row[column];
        // Escape values containing commas or quotes
        if (value == null) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `graph-results-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get sort indicator
  const getSortIndicator = (column: string) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (nodes.length === 0) {
    return (
      <div className="results-table-empty">
        <p>No results to display</p>
      </div>
    );
  }

  return (
    <div className="results-table-container">
      <div className="results-table-header">
        <div className="results-table-info">
          Showing {displayedCount} of {totalCount} records
          {totalCount > maxRows && <span className="results-table-limit"> (limited to {maxRows})</span>}
        </div>
        <button className="results-table-export-btn" onClick={handleExportCSV}>
          Export to CSV
        </button>
      </div>

      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  className={sortConfig.column === column ? 'sorted' : ''}
                >
                  <div className="results-table-header-content">
                    <span>{column}</span>
                    <span className="sort-indicator">{getSortIndicator(column)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(column => (
                  <td key={column}>
                    {row[column] != null ? String(row[column]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
