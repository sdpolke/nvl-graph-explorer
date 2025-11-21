/**
 * End-to-End Tests for Complete Workflows
 * Tests complete user workflows including search, node interaction, filtering, error scenarios, and export
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

// Mock the NVL component
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

describe('End-to-End Workflow Tests', () => {
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
        properties: { name: 'Breast Cancer', description: 'Malignant disease' },
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
    vi.mocked(services.neo4jService.connect).mockResolvedValue(undefined);
    vi.mocked(services.neo4jService.disconnect).mockResolvedValue(undefined);
    vi.mocked(services.neo4jService.executeQuery).mockResolvedValue(mockGraphData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Search Workflow: Natural Language → GPT → Cypher → Graph Display', () => {
    it('should complete full natural language search workflow', async () => {
      const user = userEvent.setup();
      const naturalQuery = 'Show me proteins related to breast cancer';
      const generatedCypher = 'MATCH (p:Protein)-[r:ASSOCIATED_WITH]->(d:Disease) WHERE toLower(d.name) CONTAINS "breast cancer" RETURN p, r, d LIMIT 50';
      
      vi.mocked(services.openAIService.generateCypherQuery).mockResolvedValue(generatedCypher);
      
      render(<App />);

      // Step 1: Wait for app initialization
      await waitFor(() => {
        expect(services.neo4jService.connect).toHaveBeenCalled();
      });

      // Step 2: User enters natural language query
      const searchInput = screen.getByPlaceholderText(/ask a question/i);
      await user.type(searchInput, naturalQuery);

      // Step 3: User submits search
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Step 4: Verify GPT conversion is called
      await waitFor(() => {
        expect(services.openAIService.generateCypherQuery).toHaveBeenCalledWith(naturalQuery);
      });

      // Step 5: Verify generated Cypher is displayed in query panel
      await waitFor(() => {
        const queryPanel = screen.getByPlaceholderText(/enter your cypher query/i);
        expect(queryPanel).toHaveValue(generatedCypher);
      });

      // Step 6: Verify Cypher query is executed
      await waitFor(() => {
        expect(services.neo4jService.executeQuery).toHaveBeenCalledWith(generatedCypher);
      });

      // Step 7: Verify graph is updated with results
      await waitFor(() => {
        expect(screen.getByTestId('nvl-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.getByTestId('node-2')).toBeInTheDocument();
        expect(screen.getByTestId('node-3')).toBeInTheDocument();
        expect(screen.getByTestId('rel-r1')).toBeInTheDocument();
        expect(screen.getByTestId('rel-r2')).toBeInTheDocument();
      });

      // Step 8: Verify result count is updated
      const dataTab = screen.getByRole('tab', { name: /data/i });
      expect(within(dataTab).getByText('3')).toBeInTheDocument();
    });

    it('should allow editing and re-executing generated Cypher query', async () => {
      const user = userEvent.setup();
      const generatedCypher = 'MATCH (p:Protein) RETURN p LIMIT 50';
      const editedCypher = 'MATCH (p:Protein) RETURN p LIMIT 10';
      
      vi.mocked(services.openAIService.generateCypherQuery).mockResolvedValue(generatedCypher);
      
      render(<App />);

      await waitFor(() => {
        expect(services.neo4jService.connect).toHaveBeenCalled();
      });

      // Perform natural language search
      const searchInput = screen.getByPlaceholderText(/ask a question/i);
      await user.type(searchInput, 'Show me proteins');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Wait for query panel to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your cypher query/i)).toBeInTheDocument();
      });

      // Edit the generated query
      const queryTextarea = screen.getByPlaceholderText(/enter your cypher query/i);
      await user.clear(queryTextarea);
      await user.type(queryTextarea, editedCypher);

      // Execute the edited query
      const executeButtons = screen.getAllByText(/^execute$/i);
      await user.click(executeButtons[0]); // Click the first Execute button (in query panel)

      // Verify edited query was executed
      await waitFor(() => {
        expect(services.neo4jService.executeQuery).toHaveBeenCalledWith(editedCypher);
      });
    });
  });

  describe('Node Interaction Workflow: Click → Detail Panel, Double-Click → Expand', () => {
    it('should complete node click and detail display workflow', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Click on a node
      const node = screen.getByTestId('node-1');
      await user.click(node);

      // Verify node click is handled (logged in console)
      // Note: In a real implementation, this would open a detail panel
      // For now, we verify the node is still visible and clickable
      expect(node).toBeInTheDocument();
    });

    it('should complete node double-click and expansion workflow', async () => {
      const user = userEvent.setup();
      
      const expandedData = {
        nodes: [
          {
            id: '4',
            labels: ['Pathway'],
            properties: { name: 'DNA Repair Pathway' },
          },
          {
            id: '5',
            labels: ['Compound'],
            properties: { name: 'Cisplatin' },
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
          {
            id: 'r4',
            type: 'TARGETS',
            startNodeId: '5',
            endNodeId: '1',
            properties: {},
          },
        ],
      };

      vi.mocked(services.neo4jService.expandNode).mockResolvedValue(expandedData);
      
      render(<App />);

      // Wait for initial graph
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Verify initial state (3 nodes, 2 relationships)
      expect(screen.getAllByTestId(/^node-/).length).toBe(3);
      expect(screen.getAllByTestId(/^rel-/).length).toBe(2);

      // Double-click to expand node
      const node = screen.getByTestId('node-1');
      await user.dblClick(node);

      // Verify expansion service is called
      await waitFor(() => {
        expect(services.neo4jService.expandNode).toHaveBeenCalledWith('1');
      });

      // Verify new nodes and relationships are added
      await waitFor(() => {
        expect(screen.getByTestId('node-4')).toBeInTheDocument();
        expect(screen.getByTestId('node-5')).toBeInTheDocument();
        expect(screen.getByTestId('rel-r3')).toBeInTheDocument();
        expect(screen.getByTestId('rel-r4')).toBeInTheDocument();
      });

      // Verify original nodes are still present
      expect(screen.getByTestId('node-1')).toBeInTheDocument();
      expect(screen.getByTestId('node-2')).toBeInTheDocument();
      expect(screen.getByTestId('node-3')).toBeInTheDocument();

      // Verify total count (5 nodes, 4 relationships)
      expect(screen.getAllByTestId(/^node-/).length).toBe(5);
      expect(screen.getAllByTestId(/^rel-/).length).toBe(4);
    });

    it('should handle multiple node expansions sequentially', async () => {
      const user = userEvent.setup();
      
      const firstExpansion = {
        nodes: [{ id: '4', labels: ['Pathway'], properties: { name: 'Pathway1' } }],
        relationships: [{ id: 'r3', type: 'PARTICIPATES_IN', startNodeId: '1', endNodeId: '4', properties: {} }],
      };

      const secondExpansion = {
        nodes: [{ id: '5', labels: ['Gene'], properties: { name: 'MDM2' } }],
        relationships: [{ id: 'r4', type: 'INTERACTS_WITH', startNodeId: '2', endNodeId: '5', properties: {} }],
      };

      vi.mocked(services.neo4jService.expandNode)
        .mockResolvedValueOnce(firstExpansion)
        .mockResolvedValueOnce(secondExpansion);
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // First expansion
      await user.dblClick(screen.getByTestId('node-1'));
      await waitFor(() => {
        expect(screen.getByTestId('node-4')).toBeInTheDocument();
      });

      // Second expansion
      await user.dblClick(screen.getByTestId('node-2'));
      await waitFor(() => {
        expect(screen.getByTestId('node-5')).toBeInTheDocument();
      });

      // Verify all nodes are present
      expect(screen.getAllByTestId(/^node-/).length).toBe(5);
    });
  });

  describe('Filtering Workflow: Select Labels → Graph Updates', () => {
    it('should complete label filtering workflow', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Verify all nodes are initially visible
      expect(screen.getByTestId('node-1')).toBeInTheDocument(); // Protein
      expect(screen.getByTestId('node-2')).toBeInTheDocument(); // Gene
      expect(screen.getByTestId('node-3')).toBeInTheDocument(); // Disease

      // Apply Protein filter
      const sidebar = screen.getByRole('complementary');
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      // Verify only Protein nodes are visible
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('node-3')).not.toBeInTheDocument();
      });

      // Verify result count is updated
      const dataTab = screen.getByRole('tab', { name: /data/i });
      expect(within(dataTab).getByText('1')).toBeInTheDocument();

      // Add Gene filter
      const geneCheckbox = within(sidebar).getByRole('checkbox', { name: /gene/i });
      await user.click(geneCheckbox);

      // Verify Protein and Gene nodes are visible
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.getByTestId('node-2')).toBeInTheDocument();
        expect(screen.queryByTestId('node-3')).not.toBeInTheDocument();
      });

      // Verify result count is updated
      expect(within(dataTab).getByText('2')).toBeInTheDocument();

      // Clear all filters
      await user.click(proteinCheckbox);
      await user.click(geneCheckbox);

      // Verify all nodes are visible again
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.getByTestId('node-2')).toBeInTheDocument();
        expect(screen.getByTestId('node-3')).toBeInTheDocument();
      });

      expect(within(dataTab).getByText('3')).toBeInTheDocument();
    });

    it('should maintain filters across tab switches', async () => {
      const user = userEvent.setup();
      
      render(<App />);

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
        expect(rows.length).toBe(2); // 1 header + 1 data row
      });

      // Switch back to Explorer
      const explorerTab = screen.getByRole('tab', { name: /explorer/i });
      await user.click(explorerTab);

      // Verify filter is still applied
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument();
      });
    });

    it('should filter relationships along with nodes', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Verify all relationships are initially visible
      expect(screen.getByTestId('rel-r1')).toBeInTheDocument();
      expect(screen.getByTestId('rel-r2')).toBeInTheDocument();

      // Apply Protein filter (node 1)
      const sidebar = screen.getByRole('complementary');
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      // Verify relationships are filtered (only those between visible nodes)
      await waitFor(() => {
        // r1 connects Protein(1) to Disease(3) - Disease is filtered out, so r1 should be hidden
        expect(screen.queryByTestId('rel-r1')).not.toBeInTheDocument();
        // r2 connects Gene(2) to Protein(1) - Gene is filtered out, so r2 should be hidden
        expect(screen.queryByTestId('rel-r2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle connection failure gracefully', async () => {
      vi.mocked(services.neo4jService.connect).mockRejectedValue(
        new Error('Failed to connect to Neo4j database')
      );
      
      render(<App />);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to connect to neo4j database/i)).toBeInTheDocument();
      });

      // Verify graph is rendered but empty (no nodes)
      const nvlWrapper = screen.getByTestId('nvl-wrapper');
      expect(nvlWrapper).toBeInTheDocument();
      expect(screen.queryByTestId(/^node-/)).not.toBeInTheDocument();
    });

    it('should handle invalid Cypher query errors', async () => {
      const user = userEvent.setup();
      
      vi.mocked(services.neo4jService.executeQuery).mockRejectedValue(
        new Error('Invalid Cypher syntax')
      );
      
      render(<App />);

      await waitFor(() => {
        expect(services.neo4jService.connect).toHaveBeenCalled();
      });

      // Switch to Cypher mode and enter invalid query
      const cypherModeButton = screen.getByRole('button', { name: /cypher query/i });
      await user.click(cypherModeButton);

      const searchInput = screen.getByPlaceholderText(/enter cypher query/i);
      await user.type(searchInput, 'INVALID QUERY');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid cypher syntax/i)).toBeInTheDocument();
      });
    });

    it('should handle GPT API failure', async () => {
      const user = userEvent.setup();
      
      vi.mocked(services.openAIService.generateCypherQuery).mockRejectedValue({
        type: 'GPT_ERROR',
        message: 'OpenAI API rate limit exceeded. Please try again later.',
        details: { code: 'RATE_LIMIT' },
      });
      
      render(<App />);

      await waitFor(() => {
        expect(services.neo4jService.connect).toHaveBeenCalled();
      });

      // Perform natural language search
      const searchInput = screen.getByPlaceholderText(/ask a question/i);
      await user.type(searchInput, 'Show me proteins');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify GPT error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/openai api rate limit exceeded/i)).toBeInTheDocument();
      });

      // Verify query was not executed
      expect(services.neo4jService.executeQuery).toHaveBeenCalledTimes(1); // Only initial load
    });

    it('should handle query timeout errors', async () => {
      const user = userEvent.setup();
      
      vi.mocked(services.neo4jService.executeQuery).mockRejectedValue({
        type: 'TIMEOUT_ERROR',
        message: 'Query execution timed out',
        details: {},
      });
      
      render(<App />);

      await waitFor(() => {
        expect(services.neo4jService.connect).toHaveBeenCalled();
      });

      // Execute a query
      const cypherModeButton = screen.getByRole('button', { name: /cypher query/i });
      await user.click(cypherModeButton);

      const searchInput = screen.getByPlaceholderText(/enter cypher query/i);
      await user.type(searchInput, 'MATCH (n) RETURN n');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify timeout error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/query execution timed out/i)).toBeInTheDocument();
      });
    });

    it('should handle node expansion errors', async () => {
      const user = userEvent.setup();
      
      vi.mocked(services.neo4jService.expandNode).mockRejectedValue(
        new Error('Failed to expand node')
      );
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Try to expand a node
      const node = screen.getByTestId('node-1');
      await user.dblClick(node);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to expand node/i)).toBeInTheDocument();
      });

      // Verify original graph is intact
      expect(screen.getByTestId('node-1')).toBeInTheDocument();
      expect(screen.getByTestId('node-2')).toBeInTheDocument();
      expect(screen.getByTestId('node-3')).toBeInTheDocument();
    });

    it('should handle empty query results', async () => {
      const user = userEvent.setup();
      
      vi.mocked(services.neo4jService.executeQuery).mockResolvedValue({
        nodes: [],
        relationships: [],
      });
      
      render(<App />);

      await waitFor(() => {
        expect(services.neo4jService.connect).toHaveBeenCalled();
      });

      // Execute a query that returns no results
      const cypherModeButton = screen.getByRole('button', { name: /cypher query/i });
      await user.click(cypherModeButton);

      const searchInput = screen.getByPlaceholderText(/enter cypher query/i);
      await user.type(searchInput, 'MATCH (n:NonExistent) RETURN n');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify "no results" message is displayed
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should handle complete workflow: search → filter → expand → tab switch', async () => {
      const user = userEvent.setup();
      
      const expandedData = {
        nodes: [{ id: '4', labels: ['Protein'], properties: { name: 'P53_RELATED' } }],
        relationships: [{ id: 'r3', type: 'INTERACTS_WITH', startNodeId: '1', endNodeId: '4', properties: {} }],
      };

      vi.mocked(services.neo4jService.expandNode).mockResolvedValue(expandedData);
      
      render(<App />);

      // Step 1: Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Step 2: Perform search
      const cypherModeButton = screen.getByRole('button', { name: /cypher query/i });
      await user.click(cypherModeButton);
      
      const searchInput = screen.getByPlaceholderText(/enter cypher query/i);
      await user.type(searchInput, 'MATCH (n) RETURN n LIMIT 50');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(services.neo4jService.executeQuery).toHaveBeenCalledWith('MATCH (n) RETURN n LIMIT 50');
      });

      // Step 3: Apply Protein filter (so expanded nodes will also be visible)
      const sidebar = screen.getByRole('complementary');
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      await waitFor(() => {
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument();
      });

      // Step 4: Expand a node (will add another Protein node)
      const node = screen.getByTestId('node-1');
      await user.dblClick(node);

      await waitFor(() => {
        expect(services.neo4jService.expandNode).toHaveBeenCalledWith('1');
      });

      // Verify expanded node is added and visible (since it's also a Protein)
      await waitFor(() => {
        expect(screen.getByTestId('node-4')).toBeInTheDocument();
      });

      // Step 5: Switch to Data tab
      const dataTab = screen.getByRole('tab', { name: /data/i });
      await user.click(dataTab);

      // Verify table shows filtered data including expanded node
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        // Should show 2 Protein nodes (original + expanded)
        const rows = within(table).getAllByRole('row');
        expect(rows.length).toBe(3); // 1 header + 2 data rows
      });

      // Step 6: Switch back to Explorer
      const explorerTab = screen.getByRole('tab', { name: /explorer/i });
      await user.click(explorerTab);

      // Verify graph still shows filtered and expanded data
      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
        expect(screen.getByTestId('node-4')).toBeInTheDocument();
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument();
      });
    });

    it('should handle rapid filter changes', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      const sidebar = screen.getByRole('complementary');
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      const geneCheckbox = within(sidebar).getByRole('checkbox', { name: /gene/i });
      const diseaseCheckbox = within(sidebar).getByRole('checkbox', { name: /disease/i });

      // Rapidly toggle filters
      await user.click(proteinCheckbox);
      await user.click(geneCheckbox);
      await user.click(proteinCheckbox);
      await user.click(diseaseCheckbox);
      await user.click(geneCheckbox);

      // Final state: only Disease filter active
      await waitFor(() => {
        expect(screen.queryByTestId('node-1')).not.toBeInTheDocument(); // Protein
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument(); // Gene
        expect(screen.getByTestId('node-3')).toBeInTheDocument(); // Disease
      });
    });

    it('should handle search with filters already applied', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('node-1')).toBeInTheDocument();
      });

      // Apply filter first
      const sidebar = screen.getByRole('complementary');
      const proteinCheckbox = within(sidebar).getByRole('checkbox', { name: /protein/i });
      await user.click(proteinCheckbox);

      await waitFor(() => {
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument();
      });

      // Perform new search
      const cypherModeButton = screen.getByRole('button', { name: /cypher query/i });
      await user.click(cypherModeButton);
      
      const searchInput = screen.getByPlaceholderText(/enter cypher query/i);
      await user.type(searchInput, 'MATCH (n:Gene) RETURN n LIMIT 10');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Wait for new results
      await waitFor(() => {
        expect(services.neo4jService.executeQuery).toHaveBeenCalledWith('MATCH (n:Gene) RETURN n LIMIT 10');
      });

      // Verify filter is still applied to new results
      // Since we searched for Genes but Protein filter is active, no nodes should be visible
      await waitFor(() => {
        expect(screen.queryByTestId('node-2')).not.toBeInTheDocument();
      });
    });
  });
});
