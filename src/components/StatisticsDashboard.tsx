import { useState, useEffect, useCallback, useMemo } from 'react';
import type { NodeStatistic, RelationshipStatistic } from '../types';
import { neo4jService } from '../services/Neo4jService';
import { nodeStyleConfig } from '../utils/styleConfig';
import { StatisticsHeader } from './StatisticsHeader';
import { StatisticsCharts } from './StatisticsCharts';
import { NodeTypeTable } from './NodeTypeTable';
import { StatisticsError } from './StatisticsError';
import { StatisticsEmpty } from './StatisticsEmpty';
import { StatisticsWarning } from './StatisticsWarning';
import './StatisticsDashboard.css';

interface StatisticsDashboardState {
  nodeStats: NodeStatistic[];
  relationshipStats: Map<string, RelationshipStatistic[]>;
  isLoading: boolean;
  error: string | null;
  errorType?: 'connection' | 'timeout' | 'query' | 'general';
  lastUpdated: Date | null;
  expandedNodeTypes: Set<string>;
  expandedOrder: string[];
  cachedData: NodeStatistic[] | null;
  partialLoadFailures: string[];
  warningDismissed: boolean;
  retryAttempt: number;
}

// @ts-expect-error - Used in future tasks for caching
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_EXPANDED = 3;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000;

export const StatisticsDashboard = () => {
  const [state, setState] = useState<StatisticsDashboardState>({
    nodeStats: [],
    relationshipStats: new Map(),
    isLoading: false,
    error: null,
    errorType: undefined,
    lastUpdated: null,
    expandedNodeTypes: new Set(),
    expandedOrder: [],
    cachedData: null,
    partialLoadFailures: [],
    warningDismissed: false,
    retryAttempt: 0,
  });

  const fetchStatistics = useCallback(async (retryAttempt = 0) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      errorType: undefined,
      partialLoadFailures: [],
      warningDismissed: false,
      retryAttempt,
    }));

    try {
      const stats = await neo4jService.getNodeStatistics({ limit: 50 });
      
      if (!stats || stats.length === 0) {
        setState(prev => ({
          ...prev,
          nodeStats: [],
          isLoading: false,
          lastUpdated: new Date(),
          cachedData: prev.nodeStats.length > 0 ? prev.nodeStats : null,
          retryAttempt: 0,
        }));
        return;
      }
      
      const totalNodes = stats.reduce((sum, stat) => sum + stat.count, 0);
      
      const nodeStats: NodeStatistic[] = stats.map(stat => ({
        label: stat.label,
        count: stat.count,
        color: nodeStyleConfig[stat.label]?.color || nodeStyleConfig.default.color,
        percentage: totalNodes > 0 ? (stat.count / totalNodes) * 100 : 0,
      }));

      setState(prev => ({
        ...prev,
        nodeStats,
        isLoading: false,
        lastUpdated: new Date(),
        cachedData: nodeStats,
        retryAttempt: 0,
      }));
    } catch (err: any) {
      const errorType = determineErrorType(err);
      
      if (errorType === 'timeout' && retryAttempt < MAX_RETRY_ATTEMPTS) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryAttempt);
        setTimeout(() => {
          fetchStatistics(retryAttempt + 1);
        }, delay);
        return;
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to fetch statistics',
        errorType,
        retryAttempt: 0,
      }));
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const determineErrorType = useCallback((err: any): 'connection' | 'timeout' | 'query' | 'general' => {
    if (err.type === 'CONNECTION_ERROR') return 'connection';
    if (err.type === 'TIMEOUT_ERROR') return 'timeout';
    if (err.type === 'QUERY_ERROR') return 'query';
    if (err.message?.toLowerCase().includes('timeout')) return 'timeout';
    if (err.message?.toLowerCase().includes('connection')) return 'connection';
    return 'general';
  }, []);

  const handleRefresh = useCallback(async () => {
    if (state.isLoading) return;
    
    setState(prev => ({
      ...prev,
      relationshipStats: new Map(),
      expandedNodeTypes: new Set(),
      expandedOrder: [],
      warningDismissed: false,
    }));
    
    await fetchStatistics();
  }, [fetchStatistics]);

  const handleUseCachedData = useCallback(() => {
    if (state.cachedData) {
      setState(prev => ({
        ...prev,
        nodeStats: state.cachedData!,
        error: null,
        errorType: undefined,
      }));
    }
  }, [state.cachedData]);

  const handleDismissWarning = useCallback(() => {
    setState(prev => ({ ...prev, warningDismissed: true }));
  }, []);

  const handleNodeTypeExpand = useCallback(async (nodeType: string) => {
    const isExpanded = state.expandedNodeTypes.has(nodeType);
    
    if (isExpanded) {
      const newExpanded = new Set(state.expandedNodeTypes);
      newExpanded.delete(nodeType);
      const newOrder = state.expandedOrder.filter(t => t !== nodeType);
      
      setState(prev => ({
        ...prev,
        expandedNodeTypes: newExpanded,
        expandedOrder: newOrder,
      }));
      return;
    }

    let newExpanded = new Set(state.expandedNodeTypes);
    let newOrder = [...state.expandedOrder];
    
    if (newExpanded.size >= MAX_EXPANDED) {
      const oldest = newOrder.shift();
      if (oldest) {
        newExpanded.delete(oldest);
      }
    }
    
    newExpanded.add(nodeType);
    newOrder.push(nodeType);

    setState(prev => ({
      ...prev,
      expandedNodeTypes: newExpanded,
      expandedOrder: newOrder,
    }));

    if (!state.relationshipStats.has(nodeType)) {
      try {
        const relStats = await neo4jService.getRelationshipStatistics(nodeType);
        
        const newRelStats = new Map(state.relationshipStats);
        newRelStats.set(nodeType, relStats);
        
        setState(prev => ({
          ...prev,
          relationshipStats: newRelStats,
        }));
      } catch (err: any) {
        console.error(`Failed to fetch relationship stats for ${nodeType}:`, err);
        
        setState(prev => ({
          ...prev,
          partialLoadFailures: [...prev.partialLoadFailures, nodeType],
        }));
      }
    }
  }, [state.expandedNodeTypes, state.expandedOrder, state.relationshipStats]);

  const handleExport = useCallback((format: 'csv' | 'json') => {
    console.log(`Export as ${format} - to be implemented in task 7`);
  }, []);

  const totalNodes = useMemo(
    () => state.nodeStats.reduce((sum, stat) => sum + stat.count, 0),
    [state.nodeStats]
  );
  
  const totalNodeTypes = useMemo(
    () => state.nodeStats.length,
    [state.nodeStats]
  );
  
  const hasPartialFailures = useMemo(
    () => state.partialLoadFailures.length > 0 && !state.warningDismissed,
    [state.partialLoadFailures, state.warningDismissed]
  );

  return (
    <div 
      className="statistics-dashboard"
      role="main"
      aria-label="Statistics Dashboard"
    >
      <StatisticsHeader
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={state.isLoading}
        lastUpdated={state.lastUpdated}
        totalNodes={totalNodes}
        totalNodeTypes={totalNodeTypes}
      />
      
      <div 
        className="statistics-content"
        role="region"
        aria-label="Statistics content"
        aria-live="polite"
        aria-busy={state.isLoading}
      >
        {state.error && (
          <StatisticsError
            error={state.error}
            errorType={state.errorType}
            onRetry={handleRefresh}
            hasCachedData={state.cachedData !== null}
            onUseCachedData={handleUseCachedData}
          />
        )}
        
        {!state.error && state.nodeStats.length === 0 && !state.isLoading && (
          <StatisticsEmpty />
        )}
        
        {!state.error && state.nodeStats.length > 0 && (
          <>
            {hasPartialFailures && (
              <StatisticsWarning
                message="Some relationship statistics could not be loaded"
                failedItems={state.partialLoadFailures}
                onDismiss={handleDismissWarning}
              />
            )}
            
            <StatisticsCharts 
              nodeStats={state.nodeStats}
              isLoading={state.isLoading && state.nodeStats.length === 0}
            />
            
            <NodeTypeTable
              nodeStats={state.nodeStats}
              relationshipStats={state.relationshipStats}
              expandedNodeTypes={state.expandedNodeTypes}
              onNodeTypeExpand={handleNodeTypeExpand}
              isLoading={state.isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
};
