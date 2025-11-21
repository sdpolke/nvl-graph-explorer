/**
 * Core type definitions for the NVL Graph Explorer application
 */

// Node representation in the graph
export interface Node {
  id: string;
  labels: string[];
  properties: Record<string, any>;
  position?: { x: number; y: number };
}

// Relationship representation in the graph
export interface Relationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

// Combined graph data structure
export interface GraphData {
  nodes: Node[];
  relationships: Relationship[];
  aggregationResults?: Record<string, any>[];
}

// Node styling configuration
export interface NodeStyle {
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'diamond';
  captionProperty: string;
  fontSize: number;
}

// Relationship styling configuration
export interface RelationshipStyle {
  color: string;
  width: number;
  showLabel: boolean;
  arrowEnabled: boolean;
}

// Complete style configuration
export interface StyleConfiguration {
  nodeStyles: Record<string, NodeStyle>;
  relationshipStyles: Record<string, RelationshipStyle>;
}

// Error types
export const ErrorType = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  QUERY_ERROR: 'QUERY_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  GPT_ERROR: 'GPT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

// Application error interface
export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
}

// ============================================================================
// State Management Types
// ============================================================================

export interface GraphContextState {
  graphData: GraphData;
  selectedNodes: string[];
  filters: {
    labels: string[];
  };
  query: {
    cypher: string;
    natural: string;
  };
  resultCount: number;
  isLoading: boolean;
  error: string | null;
}

export type GraphAction =
  | { type: 'SET_GRAPH_DATA'; payload: GraphData }
  | { type: 'ADD_NODES'; payload: Node[] }
  | { type: 'ADD_RELATIONSHIPS'; payload: Relationship[] }
  | { type: 'SELECT_NODE'; payload: string }
  | { type: 'DESELECT_NODE'; payload: string }
  | { type: 'TOGGLE_LABEL_FILTER'; payload: string }
  | { type: 'SET_QUERY'; payload: { cypher?: string; natural?: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface GraphCanvasProps {
  nodes: Node[];
  relationships: Relationship[];
  onNodeClick: (node: Node) => void;
  onNodeDoubleClick: (node: Node) => void;
  onRelationshipClick: (rel: Relationship) => void;
  styleConfig: StyleConfiguration;
}

export interface SearchBarProps {
  onSearch: (query: string, type: 'natural' | 'cypher') => void;
  isLoading: boolean;
}

export interface TaxonomySidebarProps {
  labels: string[];
  selectedLabels: string[];
  onLabelToggle: (label: string) => void;
  nodeCounts: Record<string, number>;
}

export interface QueryPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  onExecute: () => void;
  onStop: () => void;
  isExecuting: boolean;
}

export interface ResultsTableProps {
  results: QueryResult[];
  columns: string[];
  maxRows: number;
}

export interface TabNavigationProps {
  activeTab: 'graph' | 'data' | 'results';
  onTabChange: (tab: string) => void;
  resultCount: number;
}

export interface NodeDetailPanelProps {
  node: Node | null;
  onClose: () => void;
}

// ============================================================================
// Query Result Types
// ============================================================================

export interface QueryResult {
  [key: string]: any;
}
