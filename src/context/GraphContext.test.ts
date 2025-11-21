import { describe, it, expect } from 'vitest';
import { graphReducer } from './GraphContext';
import type { GraphContextState, GraphAction } from '../types';

describe('graphReducer', () => {
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

  describe('SET_GRAPH_DATA', () => {
    it('should set graph data and update result count', () => {
      const graphData = {
        nodes: [
          { id: '1', labels: ['Gene'], properties: { name: 'TP53' } },
          { id: '2', labels: ['Protein'], properties: { name: 'P53' } },
        ],
        relationships: [
          { id: '10', type: 'ENCODES', startNodeId: '1', endNodeId: '2', properties: {} },
        ],
      };

      const action: GraphAction = {
        type: 'SET_GRAPH_DATA',
        payload: graphData,
      };

      const newState = graphReducer(initialState, action);

      expect(newState.graphData).toEqual(graphData);
      expect(newState.resultCount).toBe(2);
      expect(newState.error).toBeNull();
    });
  });

  describe('ADD_NODES', () => {
    it('should add new nodes to existing graph data', () => {
      const stateWithNodes: GraphContextState = {
        ...initialState,
        graphData: {
          nodes: [{ id: '1', labels: ['Gene'], properties: { name: 'TP53' } }],
          relationships: [],
        },
      };

      const newNodes = [
        { id: '2', labels: ['Protein'], properties: { name: 'P53' } },
        { id: '3', labels: ['Disease'], properties: { name: 'Cancer' } },
      ];

      const action: GraphAction = {
        type: 'ADD_NODES',
        payload: newNodes,
      };

      const newState = graphReducer(stateWithNodes, action);

      expect(newState.graphData.nodes).toHaveLength(3);
      expect(newState.resultCount).toBe(3);
    });

    it('should prevent duplicate nodes', () => {
      const stateWithNodes: GraphContextState = {
        ...initialState,
        graphData: {
          nodes: [{ id: '1', labels: ['Gene'], properties: { name: 'TP53' } }],
          relationships: [],
        },
      };

      const duplicateNodes = [
        { id: '1', labels: ['Gene'], properties: { name: 'TP53' } },
        { id: '2', labels: ['Protein'], properties: { name: 'P53' } },
      ];

      const action: GraphAction = {
        type: 'ADD_NODES',
        payload: duplicateNodes,
      };

      const newState = graphReducer(stateWithNodes, action);

      expect(newState.graphData.nodes).toHaveLength(2);
      expect(newState.graphData.nodes.find(n => n.id === '1')).toBeDefined();
      expect(newState.graphData.nodes.find(n => n.id === '2')).toBeDefined();
    });
  });

  describe('ADD_RELATIONSHIPS', () => {
    it('should add new relationships to existing graph data', () => {
      const stateWithRels: GraphContextState = {
        ...initialState,
        graphData: {
          nodes: [],
          relationships: [
            { id: '10', type: 'ENCODES', startNodeId: '1', endNodeId: '2', properties: {} },
          ],
        },
      };

      const newRelationships = [
        { id: '11', type: 'INTERACTS_WITH', startNodeId: '2', endNodeId: '3', properties: {} },
      ];

      const action: GraphAction = {
        type: 'ADD_RELATIONSHIPS',
        payload: newRelationships,
      };

      const newState = graphReducer(stateWithRels, action);

      expect(newState.graphData.relationships).toHaveLength(2);
    });

    it('should prevent duplicate relationships', () => {
      const stateWithRels: GraphContextState = {
        ...initialState,
        graphData: {
          nodes: [],
          relationships: [
            { id: '10', type: 'ENCODES', startNodeId: '1', endNodeId: '2', properties: {} },
          ],
        },
      };

      const duplicateRelationships = [
        { id: '10', type: 'ENCODES', startNodeId: '1', endNodeId: '2', properties: {} },
        { id: '11', type: 'INTERACTS_WITH', startNodeId: '2', endNodeId: '3', properties: {} },
      ];

      const action: GraphAction = {
        type: 'ADD_RELATIONSHIPS',
        payload: duplicateRelationships,
      };

      const newState = graphReducer(stateWithRels, action);

      expect(newState.graphData.relationships).toHaveLength(2);
    });
  });

  describe('SELECT_NODE', () => {
    it('should add node to selected nodes', () => {
      const action: GraphAction = {
        type: 'SELECT_NODE',
        payload: '1',
      };

      const newState = graphReducer(initialState, action);

      expect(newState.selectedNodes).toContain('1');
      expect(newState.selectedNodes).toHaveLength(1);
    });

    it('should not add duplicate selected node', () => {
      const stateWithSelection: GraphContextState = {
        ...initialState,
        selectedNodes: ['1'],
      };

      const action: GraphAction = {
        type: 'SELECT_NODE',
        payload: '1',
      };

      const newState = graphReducer(stateWithSelection, action);

      expect(newState.selectedNodes).toHaveLength(1);
    });
  });

  describe('DESELECT_NODE', () => {
    it('should remove node from selected nodes', () => {
      const stateWithSelection: GraphContextState = {
        ...initialState,
        selectedNodes: ['1', '2', '3'],
      };

      const action: GraphAction = {
        type: 'DESELECT_NODE',
        payload: '2',
      };

      const newState = graphReducer(stateWithSelection, action);

      expect(newState.selectedNodes).not.toContain('2');
      expect(newState.selectedNodes).toHaveLength(2);
      expect(newState.selectedNodes).toEqual(['1', '3']);
    });
  });

  describe('TOGGLE_LABEL_FILTER', () => {
    it('should add label to filters when not present', () => {
      const action: GraphAction = {
        type: 'TOGGLE_LABEL_FILTER',
        payload: 'Gene',
      };

      const newState = graphReducer(initialState, action);

      expect(newState.filters.labels).toContain('Gene');
      expect(newState.filters.labels).toHaveLength(1);
    });

    it('should remove label from filters when present', () => {
      const stateWithFilters: GraphContextState = {
        ...initialState,
        filters: {
          labels: ['Gene', 'Protein', 'Disease'],
        },
      };

      const action: GraphAction = {
        type: 'TOGGLE_LABEL_FILTER',
        payload: 'Protein',
      };

      const newState = graphReducer(stateWithFilters, action);

      expect(newState.filters.labels).not.toContain('Protein');
      expect(newState.filters.labels).toHaveLength(2);
      expect(newState.filters.labels).toEqual(['Gene', 'Disease']);
    });
  });

  describe('SET_QUERY', () => {
    it('should update cypher query', () => {
      const action: GraphAction = {
        type: 'SET_QUERY',
        payload: { cypher: 'MATCH (n) RETURN n' },
      };

      const newState = graphReducer(initialState, action);

      expect(newState.query.cypher).toBe('MATCH (n) RETURN n');
      expect(newState.query.natural).toBe('');
    });

    it('should update natural language query', () => {
      const action: GraphAction = {
        type: 'SET_QUERY',
        payload: { natural: 'Show me genes' },
      };

      const newState = graphReducer(initialState, action);

      expect(newState.query.natural).toBe('Show me genes');
      expect(newState.query.cypher).toBe('');
    });

    it('should update both queries', () => {
      const action: GraphAction = {
        type: 'SET_QUERY',
        payload: {
          cypher: 'MATCH (n:Gene) RETURN n',
          natural: 'Show me genes',
        },
      };

      const newState = graphReducer(initialState, action);

      expect(newState.query.cypher).toBe('MATCH (n:Gene) RETURN n');
      expect(newState.query.natural).toBe('Show me genes');
    });
  });

  describe('SET_LOADING', () => {
    it('should set loading state to true', () => {
      const action: GraphAction = {
        type: 'SET_LOADING',
        payload: true,
      };

      const newState = graphReducer(initialState, action);

      expect(newState.isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      const stateLoading: GraphContextState = {
        ...initialState,
        isLoading: true,
      };

      const action: GraphAction = {
        type: 'SET_LOADING',
        payload: false,
      };

      const newState = graphReducer(stateLoading, action);

      expect(newState.isLoading).toBe(false);
    });
  });

  describe('SET_ERROR', () => {
    it('should set error message and stop loading', () => {
      const stateLoading: GraphContextState = {
        ...initialState,
        isLoading: true,
      };

      const action: GraphAction = {
        type: 'SET_ERROR',
        payload: 'Connection failed',
      };

      const newState = graphReducer(stateLoading, action);

      expect(newState.error).toBe('Connection failed');
      expect(newState.isLoading).toBe(false);
    });

    it('should clear error when set to null', () => {
      const stateWithError: GraphContextState = {
        ...initialState,
        error: 'Previous error',
      };

      const action: GraphAction = {
        type: 'SET_ERROR',
        payload: null,
      };

      const newState = graphReducer(stateWithError, action);

      expect(newState.error).toBeNull();
    });
  });
});
