/**
 * Integration Tests for Component Interactions
 * Tests the integration between SearchBar, TaxonomySidebar, TabNavigation, and GraphCanvas
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as services from '../services';

// Mock the services
vi.mock('../services', () => ({
  neo4jService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    executeQuery: vi.fn(),
    expandNode: vi.fn(),
    isServiceConnected: vi.fn(() => true),
  },
  openAIService: {
    generateCypherQuery: vi.fn(),
  },
}));

// Mock the NVL component to avoid canvas rendering issues in tests
vi.mock('@neo4j-nvl/react', () => ({
  InteractiveNvlWrapper: ({ nodes, rels, mouseEventCallbacks }: any) => (
    <div data-testid="nvl-wrapper">
      <div data-testid="nvl-nodes">
        {nodes.map((node: any) => (
          <div
            key={node.id}
            data-testid={`node-${node.id}`}
            data-node-id={node.id}
            onClick={() => mouseEventCallbacks?.onNodeClick?.(node)}
            onDoubleClick={() => mouseEventCallbacks?.onNodeDoubleClick?.(node)}
          >
            {node.caption}
          </div>
        ))}
      </div>
      <div data-testid="nvl-relationships">
        {rels.map((rel: any) => (
          <div
            key={rel.id}
            data-testid={`rel-${rel.id}`}
            onClick={() => mouseEventCallbacks?.onRelationshipClick?.(rel)}
          >
            {rel.type}
          </div>
        ))}
      </div>
    </div>
  ),
}));

describe('App Integration Tests', () => {
  const mockGraphData = {
    nodes: [
      {
        id: '1',
        labels: ['Protein'],
        properties: { name: 'TP53', function: 'Tumor suppressor' },
      },
      {
        id: '2',
        labels: ['Gene'],
        properties: { name: 'BRCA1', symbol: 'BRCA1' },
      },
      {
        id: '3',
        labels: ['Disease'],
        properties: { name: 'Cancer', description: 'Malignant disease' },
      },
    ],
    relationships: [
      {
        id: 'r1',
        type: 'ASSOCIATED_WITH',
        startNodeId: '1',
        endNodeId: '3',
        properties: {},
      },
      {
        id: 'r2',
        type: 'ENCODES',
        startNodeId: '2',
        endNodeId: '1',
        properties: {},
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(services.neo4jService.connect).mockResolvedValue(undefined);
    vi.mocked(services.neo4jService.disconnect).mockResolvedValue(undefined);
    vi.mocked(services.neo4jService.executeQuery).mockResolvedValue(mockGraphData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SearchBar Integration with GraphCanvas', () => {
    it('should update GraphCanvas when natural language search is performed', async () => {
      const user = userEvent.setup();
      const generatedCypher = 'MATCH (n:Protein) RETURN n LIMIT 50';
      
      vi.mocked(services.openAIService.generateCypherQuery).mockResolvedValue(generatedCypher);
      
      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(services.neo4jService.connect).toHaveBeenCalled();
      });

      // Find and interact with search bar
      const searchInput = screen.getByPlaceholderText(/ask a question/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      // Enter natural language query
      await user.type(searchInput, 'Show me proteins related to cancer');
      await user.click(searchButton);

      // Verify OpenAI service was called
      await waitFor(() => {
        expect(services.openAIService.generateCypherQuery).toHaveBeenCalledWith(
          'Show me proteins related to cancer'
        );
      });

      // Verify Neo4j query was executed with generated Cypher
      await waitFor(() => {
        expect(services.neo4jService.executeQuery).toHaveBeenCalledWith(generatedCypher);
      });

      // Verify graph canvas is updated with results
      await waitFor(() => {
        expect(screen.getByTestId('nvl-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.getByTestId('node-2')).toBeInTheDocument();
      });
    });

    it('should update GraphCanvas when Cypher query is executed directly', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(services.neo4jService.connect).toHaveBeenCalled();
      });

      // Switch to Cypher mode
      const cypherModeButton = screen.getByRole('button', { name: /cypher query/i });
      await user.click(cypherModeButton);

      // Enter Cypher query
      const searchInput = screen.getByPlaceholderText(/enter cypher query/i);
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'MATCH (n:Gene) RETURN n LIMIT 10');
      await user.click(searchButton);

      // Verify query was executed directly (no OpenAI call)
      await waitFor(() => {
        expect(services.openAIService.generateCypherQuery).not.toHaveBeenCalled();
        expect(services.neo4jService.executeQuery).toHaveBeenCalledWith(
          'MATCH (n:Gene) RETURN n LIMIT 10'
        );
      });

      // Verify graph canvas is updated
      await waitFor(() => {
        expect(screen.getByTestId('nvl-wrapper')).toBeInTheDocument();
      });
    });
  });

  describe('TaxonomySidebar Filtering Integration', () => {
    it('should filter GraphCanvas nodes when labels are selected in TaxonomySidebar', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.getByTestId('node-2')).toBeInTheDocument();
        expect(screen.getByTestId('node-3')).toBeInTheDocument();
      });

      // Find the taxonomy sidebar
      const sidebar = screen.getByRole('complementary');
      
      // Select only "Protein" label
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      // Verify only Protein nodes are visible
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument(); // Protein
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument(); // Gene (filtered out)
        expect(screen.queryByTestId('node-3')).not.toBeInTheDocument(); // Disease (filtered out)
      });
    });

    it('should show all nodes when multiple labels are selected', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      const sidebar = screen.getByRole('complementary');
      
      // Select Protein and Gene labels
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      const geneCheckbox = within(sidebar).getByRole('checkbox', { name: /gene/i });
      
      await user.click(proteinCheckbox);
      await user.click(geneCheckbox);

      // Verify both Protein and Gene nodes are visible
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument(); // Protein
        expect(screen.getByTestId('node-2')).toBeInTheDocument(); // Gene
        expect(screen.queryByTestId('node-3')).not.toBeInTheDocument(); // Disease (filtered out)
      });
    });

    it('should restore all nodes when filters are cleared', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      const sidebar = screen.getByRole('complementary');
      
      // Select a filter
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      // Verify filtering works
      await waitFor(() => {
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument();
      });

      // Deselect the filter
      await user.click(proteinCheckbox);

      // Verify all nodes are visible again
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.getByTestId('node-2')).toBeInTheDocument();
        expect(screen.getByTestId('node-3')).toBeInTheDocument();
      });
    });
  });

  describe('TabNavigation Integration', () => {
    it('should switch between graph and data views correctly', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('nvl-wrapper')).toBeInTheDocument();
      });

      // Verify graph view is shown by default
      expect(screen.getByTestId('nvl-wrapper')).toBeInTheDocument();

      // Switch to Data tab
      const dataTab = screen.getByRole('tab', { name: /data/i });
      await user.click(dataTab);

      // Verify data table is shown and graph is hidden
      await waitFor(() => {
        expect(screen.queryByTestId('nvl-wrapper')).not.toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Switch back to Explorer tab
      const explorerTab = screen.getByRole('tab', { name: /explorer/i });
      await user.click(explorerTab);

      // Verify graph view is shown again
      await waitFor(() => {
        expect(screen.getByTestId('nvl-wrapper')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    it('should display result count badge on Data tab', async () => {
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Find the Data tab and verify badge shows count
      const dataTab = screen.getByRole('tab', { name: /data/i });
      const badge = within(dataTab).getByText('3'); // 3 nodes in mock data
      
      expect(badge).toBeInTheDocument();
    });

    it('should update result count when filters are applied', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Verify initial count
      const dataTab = screen.getByRole('tab', { name: /data/i });
      expect(within(dataTab).getByText('3')).toBeInTheDocument();

      // Apply filter
      const sidebar = screen.getByRole('complementary');
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      // Verify count is updated
      await waitFor(() => {
        expect(within(dataTab).getByText('1')).toBeInTheDocument(); // Only 1 Protein node
      });
    });
  });

  describe('Node Expansion Flow Integration', () => {
    it('should expand node and update graph when node is double-clicked', async () => {
      const user = userEvent.setup();
      
      const expandedData = {
        nodes: [
          {
            id: '4',
            labels: ['Pathway'],
            properties: { name: 'DNA Repair' },
          },
        ],
        relationships: [
          {
            id: 'r3',
            type: 'PARTICIPATES_IN',
            startNodeId: '1',
            endNodeId: '4',
            properties: {},
          },
        ],
      };

      vi.mocked(services.neo4jService.expandNode).mockResolvedValue(expandedData);
      
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Double-click on a node to expand
      const node = screen.getByTestId('node-1');
      await user.dblClick(node);

      // Verify expandNode was called
      await waitFor(() => {
        expect(services.neo4jService.expandNode).toHaveBeenCalledWith('1');
      });

      // Verify new nodes are added to the graph
      await waitFor(() => {
        expect(screen.getByTestId('node-4')).toBeInTheDocument();
        expect(screen.getByTestId('rel-r3')).toBeInTheDocument();
      });

      // Verify original nodes are still present
      expect(screen.getByTestId('node-1')).toBeInTheDocument();
      expect(screen.getByTestId('node-2')).toBeInTheDocument();
    });

    it('should prevent duplicate nodes when expanding', async () => {
      const user = userEvent.setup();
      
      // Return data that includes an existing node
      const expandedData = {
        nodes: [
          {
            id: '1', // Duplicate node
            labels: ['Protein'],
            properties: { name: 'TP53' },
          },
          {
            id: '5',
            labels: ['Gene'],
            properties: { name: 'MDM2' },
          },
        ],
        relationships: [
          {
            id: 'r4',
            type: 'INTERACTS_WITH',
            startNodeId: '1',
            endNodeId: '5',
            properties: {},
          },
        ],
      };

      vi.mocked(services.neo4jService.expandNode).mockResolvedValue(expandedData);
      
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Count initial nodes
      const initialNodes = screen.getAllByTestId(/^node-/);
      const initialNodeCount = initialNodes.length;

      // Double-click to expand
      const node = screen.getByTestId('node-1');
      await user.dblClick(node);

      // Wait for expansion
      await waitFor(() => {
        expect(services.neo4jService.expandNode).toHaveBeenCalled();
      });

      // Verify only new node was added (not the duplicate)
      await waitFor(() => {
        const updatedNodes = screen.getAllByTestId(/^node-/);
        expect(updatedNodes.length).toBe(initialNodeCount + 1); // Only 1 new node added
        expect(screen.getByTestId('node-5')).toBeInTheDocument();
      });
    });

    it('should handle expansion errors gracefully', async () => {
      const user = userEvent.setup();
      
      vi.mocked(services.neo4jService.expandNode).mockRejectedValue(
        new Error('Failed to expand node')
      );
      
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Double-click to expand
      const node = screen.getByTestId('node-1');
      await user.dblClick(node);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to expand node/i)).toBeInTheDocument();
      });

      // Verify original graph is still intact
      expect(screen.getByTestId('node-1')).toBeInTheDocument();
      expect(screen.getByTestId('node-2')).toBeInTheDocument();
    });
  });

  describe('Combined Integration Scenarios', () => {
    it('should handle search followed by filtering', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Perform search
      const searchInput = screen.getByPlaceholderText(/ask a question/i);
      const cypherModeButton = screen.getByRole('button', { name: /cypher query/i });
      await user.click(cypherModeButton);
      
      await user.type(searchInput, 'MATCH (n) RETURN n LIMIT 50');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(services.neo4jService.executeQuery).toHaveBeenCalled();
      });

      // Apply filter
      const sidebar = screen.getByRole('complementary');
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      // Verify filtering works on search results
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument(); // Protein
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument(); // Gene filtered
      });
    });

    it('should handle tab switching with filtered data', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Apply filter
      const sidebar = screen.getByRole('complementary');
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      // Switch to Data tab
      const dataTab = screen.getByRole('tab', { name: /data/i });
      await user.click(dataTab);

      // Verify table shows only filtered data
      await waitFor(() => {
        const table = screen.getByRole('table');
        const rows = within(table).getAllByRole('row');
        // 1 header row + 1 data row (only Protein node)
        expect(rows.length).toBe(2);
      });
    });

    it('should maintain expanded nodes when switching tabs', async () => {
      const user = userEvent.setup();
      
      const expandedData = {
        nodes: [
          {
            id: '6',
            labels: ['Compound'],
            properties: { name: 'Aspirin' },
          },
        ],
        relationships: [
          {
            id: 'r5',
            type: 'TARGETS',
            startNodeId: '6',
            endNodeId: '1',
            properties: {},
          },
        ],
      };

      vi.mocked(services.neo4jService.expandNode).mockResolvedValue(expandedData);
      
      render(<App />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Expand a node
      const node = screen.getByTestId('node-1');
      await user.dblClick(node);

      await waitFor(() => {
        expect(screen.getByTestId('node-6')).toBeInTheDocument();
      });

      // Switch to Data tab
      const dataTab = screen.getByRole('tab', { name: /data/i });
      await user.click(dataTab);

      // Verify expanded data is in table
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(within(table).getByText('Aspirin')).toBeInTheDocument();
      });

      // Switch back to Explorer
      const explorerTab = screen.getByRole('tab', { name: /explorer/i });
      await user.click(explorerTab);

      // Verify expanded nodes are still in graph
      await waitFor(() => {
        expect(screen.getByTestId('node-6')).toBeInTheDocument();
      });
    });
  });
});
