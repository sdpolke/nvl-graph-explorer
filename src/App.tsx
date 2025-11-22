import { useState, useEffect, useMemo } from 'react';
import { GraphProvider } from './context/GraphContext';
import { GraphCanvas } from './components/GraphCanvas';
import { SearchBar } from './components/SearchBar';
import { QueryPanel } from './components/QueryPanel';
import { TaxonomySidebar } from './components/TaxonomySidebar';
import { TabNavigation } from './components/TabNavigation';
import { ResultsTable } from './components/ResultsTable';
import { Header } from './components/Header';
import { AggregationResults } from './components/AggregationResults';
import { StatisticsDashboard } from './components/StatisticsDashboard';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';
import { styleConfiguration } from './utils/styleConfig';
import { neo4jService, openAIService } from './services';
import type { Node, Relationship, GraphData } from './types';
import './App.css';

function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], relationships: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuery, setGeneratedQuery] = useState<string>('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showQueryPanel, setShowQueryPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'data'>('graph');
  const [dbSchema, setDbSchema] = useState<string>('');
  const [aggregationResults, setAggregationResults] = useState<Record<string, any>[] | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  // Calculate available labels and node counts from graph data
  const { availableLabels, nodeCounts } = useMemo(() => {
    const labelSet = new Set<string>();
    const counts: Record<string, number> = {};

    graphData.nodes.forEach(node => {
      node.labels.forEach(label => {
        labelSet.add(label);
        counts[label] = (counts[label] || 0) + 1;
      });
    });

    return {
      availableLabels: Array.from(labelSet).sort(),
      nodeCounts: counts,
    };
  }, [graphData.nodes]);

  // Filter nodes based on selected labels
  const filteredGraphData = useMemo(() => {
    // If no labels are selected, show all nodes
    if (selectedLabels.length === 0) {
      return graphData;
    }

    // Filter nodes that have at least one of the selected labels
    const filteredNodes = graphData.nodes.filter(node =>
      node.labels.some(label => selectedLabels.includes(label))
    );

    // Get IDs of filtered nodes
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    // Filter relationships to only include those between visible nodes
    const filteredRelationships = graphData.relationships.filter(
      rel => filteredNodeIds.has(rel.startNodeId) && filteredNodeIds.has(rel.endNodeId)
    );

    return {
      nodes: filteredNodes,
      relationships: filteredRelationships,
    };
  }, [graphData, selectedLabels]);

  // Initialize Neo4j driver and load initial data on mount
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (cancelled) return;
      await initializeApp();
    };

    init();

    // Disconnect when page is closed/refreshed
    const handleUnload = () => {
      neo4jService.disconnect().catch(err => {
        console.error('Error disconnecting from Neo4j:', err);
      });
    };

    window.addEventListener('beforeunload', handleUnload);

    // Cleanup: only disconnect when truly unmounting (not in React Strict Mode double-render)
    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleUnload);
      // Don't disconnect here - let the driver persist for the app lifetime
    };
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize Neo4j driver and verify connectivity
      await neo4jService.connect();
      console.log('Successfully connected to Neo4j database');

      // Fetch database schema for OpenAI context
      try {
        const schemaInfo = await neo4jService.getSchema();
        setDbSchema(schemaInfo.schema);
        console.log('Fetched database schema:', schemaInfo.nodeLabels.length, 'labels,', schemaInfo.relationshipTypes.length, 'relationship types');
      } catch (schemaErr) {
        console.warn('Failed to fetch schema, will use default schema:', schemaErr);
      }

      // Load initial graph data with default query
      await loadInitialData();

      // Clear any previous errors on successful load
      setError(null);
    } catch (err: any) {
      console.error('Failed to initialize application:', err);
      const errorMessage = err.message || 'Failed to connect to database. Please check your Neo4j connection.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      // Load just one Protein node to start with
      let data = await neo4jService.executeQuery(
        'MATCH (n:Protein) RETURN n LIMIT 1'
      );

      // If no Protein nodes found, try to get any single node
      if (data.nodes.length === 0) {
        console.log('No Protein nodes found, trying to load any node...');
        data = await neo4jService.executeQuery(
          'MATCH (n) RETURN n LIMIT 1'
        );
      }

      setGraphData(data);
      console.log(`Loaded ${data.nodes.length} initial node(s)`);

      // Show a message if no data was found
      if (data.nodes.length === 0) {
        setError('No data found in the database. Please add some nodes to get started.');
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      throw err;
    }
  };

  const handleSearch = async (query: string, type: 'natural' | 'cypher', fromSuggestion: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Set active query if from suggestion, clear if manual input
      if (fromSuggestion) {
        setActiveQuery(query);
      } else {
        setActiveQuery(null);
      }

      let cypherQuery = query;

      // If natural language, convert to Cypher using OpenAI
      if (type === 'natural') {
        try {
          cypherQuery = await openAIService.generateCypherQuery(query, dbSchema);
          setGeneratedQuery(cypherQuery);
          setShowQueryPanel(true); // Show query panel when query is generated
          console.log('Generated Cypher query:', cypherQuery);
        } catch (err: any) {
          // Handle GPT-specific errors with user-friendly messages
          const errorMessage = err.message || 'Failed to convert natural language to Cypher query';
          setError(errorMessage);
          setIsLoading(false);
          return;
        }
      } else {
        setGeneratedQuery(query);
        setShowQueryPanel(true); // Show query panel for direct Cypher queries
      }

      // Execute the Cypher query
      const data = await neo4jService.executeQuery(cypherQuery);

      // Handle aggregation results
      if (data.aggregationResults && data.aggregationResults.length > 0) {
        setAggregationResults(data.aggregationResults);
        setGraphData({ nodes: [], relationships: [] }); // Clear graph
      } else {
        setGraphData(data);
        setAggregationResults(null);

        if (data.nodes.length === 0) {
          setError('No results found. Try a different query.');
        }
      }
    } catch (err: any) {
      console.error('Search error:', err);
      const errorMessage = err.message || 'Failed to execute query';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (query: string) => {
    setGeneratedQuery(query);
  };

  const handleQueryExecute = async () => {
    if (!generatedQuery.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      // Execute the Cypher query
      const data = await neo4jService.executeQuery(generatedQuery);

      // Handle aggregation results
      if (data.aggregationResults && data.aggregationResults.length > 0) {
        setAggregationResults(data.aggregationResults);
        setGraphData({ nodes: [], relationships: [] }); // Clear graph
      } else {
        setGraphData(data);
        setAggregationResults(null);

        if (data.nodes.length === 0) {
          setError('No results found. Try a different query.');
        }
      }
    } catch (err: any) {
      console.error('Query execution error:', err);
      const errorMessage = err.message || 'Failed to execute query';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryStop = async () => {
    try {
      await neo4jService.stopQuery();
      setIsLoading(false);
      setError('Query execution stopped by user');
    } catch (err: any) {
      console.error('Error stopping query:', err);
      setError('Failed to stop query');
    }
  };

  const handleNodeClick = async (node: Node) => {
    console.log('Node clicked (expand):', node.id, node.properties.common_name || node.properties.name);
    
    // Show node details
    setSelectedNode(node);
    setSelectedRelationship(null);
    
    try {
      setIsLoading(true);
      setError(null);

      // Fetch connected nodes and relationships
      const expandedData = await neo4jService.expandNode(node.id);
      console.log('Expanded data received:', {
        totalNodes: expandedData.nodes.length,
        totalRels: expandedData.relationships.length,
        nodeIds: expandedData.nodes.map(n => n.id),
        relIds: expandedData.relationships.map(r => r.id)
      });

      // Prevent duplicate nodes from being added
      const existingNodeIds = new Set(graphData.nodes.map(n => n.id));
      const newNodes = expandedData.nodes.filter(n => !existingNodeIds.has(n.id));

      // Prevent duplicate relationships from being added
      const existingRelIds = new Set(graphData.relationships.map(r => r.id));
      const newRels = expandedData.relationships.filter(r => !existingRelIds.has(r.id));

      console.log('After filtering duplicates:', {
        newNodes: newNodes.length,
        newRels: newRels.length,
        existingNodes: graphData.nodes.length,
        existingRels: graphData.relationships.length
      });

      // Merge new nodes and relationships into existing graph data
      setGraphData({
        nodes: [...graphData.nodes, ...newNodes],
        relationships: [...graphData.relationships, ...newRels],
      });

      // Log expansion results
      console.log(`✓ Expanded node: Added ${newNodes.length} nodes and ${newRels.length} relationships`);

      // Show message if no new connections found
      if (newNodes.length === 0 && newRels.length === 0) {
        console.log('No new connections found - node may already be fully expanded');
      }
    } catch (err: any) {
      console.error('Failed to expand node:', err);
      const errorMessage = err.message || 'Failed to expand node. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeDoubleClick = async (node: Node) => {
    console.log('Node double-clicked (expand):', node);
    try {
      setIsLoading(true);
      setError(null);

      // Fetch connected nodes and relationships
      const expandedData = await neo4jService.expandNode(node.id);

      // Prevent duplicate nodes from being added
      const existingNodeIds = new Set(graphData.nodes.map(n => n.id));
      const newNodes = expandedData.nodes.filter(n => !existingNodeIds.has(n.id));

      // Prevent duplicate relationships from being added
      const existingRelIds = new Set(graphData.relationships.map(r => r.id));
      const newRels = expandedData.relationships.filter(r => !existingRelIds.has(r.id));

      // Merge new nodes and relationships into existing graph data
      setGraphData({
        nodes: [...graphData.nodes, ...newNodes],
        relationships: [...graphData.relationships, ...newRels],
      });

      // Log expansion results
      console.log(`Expanded node ${node.id}: Added ${newNodes.length} nodes and ${newRels.length} relationships`);

      // Show message if no new connections found
      if (newNodes.length === 0 && newRels.length === 0) {
        setError('No new connections found for this node.');
      }
    } catch (err: any) {
      console.error('Failed to expand node:', err);
      const errorMessage = err.message || 'Failed to expand node. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelationshipClick = (rel: Relationship) => {
    console.log('Relationship clicked:', rel);
    setSelectedRelationship(rel);
    setSelectedNode(null);
  };

  const handleLabelToggle = (label: string) => {
    setSelectedLabels(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  const handleQuerySelect = (query: string) => {
    handleSearch(query, 'natural', true);
  };

  return (
    <GraphProvider>
      {showStatistics ? (
        <div className="app-container">
          <Header
            nodeCount={graphData.nodes.length}
            relationshipCount={graphData.relationships.length}
            onStatisticsClick={() => setShowStatistics(false)}
          />
          <div className="statistics-fullscreen">
            <StatisticsDashboard />
          </div>
        </div>
      ) : (
        <div className="app-container">
          <Header
            nodeCount={graphData.nodes.length}
            relationshipCount={graphData.relationships.length}
            onStatisticsClick={() => setShowStatistics(true)}
          />

        <div className="search-area">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {showQueryPanel && (
            <div style={{ marginTop: '1rem' }}>
              <QueryPanel
                query={generatedQuery}
                onQueryChange={handleQueryChange}
                onExecute={handleQueryExecute}
                onStop={handleQueryStop}
                isExecuting={isLoading}
              />
            </div>
          )}
        </div>

          <div className="main-content">
            <TaxonomySidebar
              labels={availableLabels}
              selectedLabels={selectedLabels}
              onLabelToggle={handleLabelToggle}
              nodeCounts={nodeCounts}
              onQuerySelect={handleQuerySelect}
              isQueryExecuting={isLoading}
              activeQuery={activeQuery}
            />

            <main className="content-panel">
              <TabNavigation
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as 'graph' | 'data')}
                resultCount={filteredGraphData.nodes.length}
              />

              <NodeDetailsPanel
                selectedNode={selectedNode}
                selectedRelationship={selectedRelationship}
                onClose={() => {
                  setSelectedNode(null);
                  setSelectedRelationship(null);
                }}
              />

              <div className="tab-content">
                {activeTab === 'graph' && (
                  <div className="graph-view">
                    <div className="graph-canvas-wrapper">
                      <GraphCanvas
                        nodes={filteredGraphData.nodes}
                        relationships={filteredGraphData.relationships}
                        onNodeClick={handleNodeClick}
                        onNodeDoubleClick={handleNodeDoubleClick}
                        onRelationshipClick={handleRelationshipClick}
                        styleConfig={styleConfiguration}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'data' && (
                  <ResultsTable nodes={filteredGraphData.nodes} maxRows={50} />
                )}
              </div>
            </main>
          </div>

          {aggregationResults && (
            <AggregationResults
              results={aggregationResults}
              onClose={() => setAggregationResults(null)}
            />
          )}
        </div>
      )}
    </GraphProvider>
  );
}

export default App;
