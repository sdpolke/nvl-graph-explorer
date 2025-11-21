import React, { createContext, useReducer, useContext } from 'react';
import type { ReactNode } from 'react';
import type { GraphContextState, GraphAction, GraphData, Node, Relationship } from '../types';

// Initial state
const initialState: GraphContextState = {
  graphData: {
    nodes: [],
    relationships: [],
  },
  selectedNodes: [],
  filters: {
    labels: [],
  },
  query: {
    cypher: '',
    natural: '',
  },
  resultCount: 0,
  isLoading: false,
  error: null,
};

// Reducer function
export const graphReducer = (state: GraphContextState, action: GraphAction): GraphContextState => {
  switch (action.type) {
    case 'SET_GRAPH_DATA':
      return {
        ...state,
        graphData: action.payload,
        resultCount: action.payload.nodes.length,
        error: null,
      };

    case 'ADD_NODES': {
      // Prevent duplicate nodes
      const existingNodeIds = new Set(state.graphData.nodes.map(n => n.id));
      const newNodes = action.payload.filter(node => !existingNodeIds.has(node.id));
      
      return {
        ...state,
        graphData: {
          ...state.graphData,
          nodes: [...state.graphData.nodes, ...newNodes],
        },
        resultCount: state.graphData.nodes.length + newNodes.length,
      };
    }

    case 'ADD_RELATIONSHIPS': {
      // Prevent duplicate relationships
      const existingRelIds = new Set(state.graphData.relationships.map(r => r.id));
      const newRelationships = action.payload.filter(rel => !existingRelIds.has(rel.id));
      
      return {
        ...state,
        graphData: {
          ...state.graphData,
          relationships: [...state.graphData.relationships, ...newRelationships],
        },
      };
    }

    case 'SELECT_NODE':
      if (state.selectedNodes.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        selectedNodes: [...state.selectedNodes, action.payload],
      };

    case 'DESELECT_NODE':
      return {
        ...state,
        selectedNodes: state.selectedNodes.filter(id => id !== action.payload),
      };

    case 'TOGGLE_LABEL_FILTER': {
      const labelIndex = state.filters.labels.indexOf(action.payload);
      const newLabels = labelIndex >= 0
        ? state.filters.labels.filter(l => l !== action.payload)
        : [...state.filters.labels, action.payload];
      
      return {
        ...state,
        filters: {
          ...state.filters,
          labels: newLabels,
        },
      };
    }

    case 'SET_QUERY':
      return {
        ...state,
        query: {
          cypher: action.payload.cypher ?? state.query.cypher,
          natural: action.payload.natural ?? state.query.natural,
        },
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    default:
      return state;
  }
};

// Context type
interface GraphContextType {
  state: GraphContextState;
  dispatch: React.Dispatch<GraphAction>;
}

// Create context
const GraphContext = createContext<GraphContextType | undefined>(undefined);

// Provider props
interface GraphProviderProps {
  children: ReactNode;
}

// Provider component
export const GraphProvider: React.FC<GraphProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(graphReducer, initialState);

  return (
    <GraphContext.Provider value={{ state, dispatch }}>
      {children}
    </GraphContext.Provider>
  );
};

// Custom hook to access graph state
export const useGraphData = () => {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraphData must be used within a GraphProvider');
  }
  return context.state;
};

// Custom hook to access graph actions
export const useGraphActions = () => {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraphActions must be used within a GraphProvider');
  }

  const { dispatch } = context;

  return {
    setGraphData: (data: GraphData) => {
      dispatch({ type: 'SET_GRAPH_DATA', payload: data });
    },
    
    addNodes: (nodes: Node[]) => {
      dispatch({ type: 'ADD_NODES', payload: nodes });
    },
    
    addRelationships: (relationships: Relationship[]) => {
      dispatch({ type: 'ADD_RELATIONSHIPS', payload: relationships });
    },
    
    selectNode: (nodeId: string) => {
      dispatch({ type: 'SELECT_NODE', payload: nodeId });
    },
    
    deselectNode: (nodeId: string) => {
      dispatch({ type: 'DESELECT_NODE', payload: nodeId });
    },
    
    toggleLabelFilter: (label: string) => {
      dispatch({ type: 'TOGGLE_LABEL_FILTER', payload: label });
    },
    
    setQuery: (query: { cypher?: string; natural?: string }) => {
      dispatch({ type: 'SET_QUERY', payload: query });
    },
    
    setLoading: (isLoading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: isLoading });
    },
    
    setError: (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },
  };
};

// Export context for testing purposes
export { GraphContext };
