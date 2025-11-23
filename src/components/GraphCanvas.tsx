import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import type { MouseEventCallbacks } from '@neo4j-nvl/react';
import type { Node as NvlNode, Relationship as NvlRelationship } from '@neo4j-nvl/base';
import type NVL from '@neo4j-nvl/base';
import { Maximize2, Minimize2, Maximize, RotateCcw } from 'lucide-react';
import type { GraphCanvasProps } from '../types';
import { getNodeStyle, getRelationshipStyle } from '../utils/styleConfig';
import './GraphCanvas.css';

/**
 * GraphCanvas component - Interactive graph visualization using Neo4j NVL
 * 
 * This component wraps the @neo4j-nvl/react InteractiveNvlWrapper and provides:
 * - Force-directed layout
 * - Zoom and pan controls
 * - Node and relationship interactions
 * - Dynamic styling based on entity types
 * - Fullscreen mode
 * - Fit to view functionality
 * - Chat integration with viewport adjustment
 */
export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  relationships,
  onNodeClick,
  onNodeExpand,
  onRelationshipClick,
  chatMode = 'minimized',
  chatHighlightedEntities = new Set(),
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const nvlRef = useRef<NVL | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState<number | undefined>(undefined);
  // Adjust viewport width when chat is docked
  useEffect(() => {
    if (isFullscreen) {
      // In fullscreen, always use full width
      setCanvasWidth(undefined);
    } else if (chatMode === 'docked') {
      // Reduce canvas width by chat panel width (400px)
      const chatWidth = 400;
      setCanvasWidth(window.innerWidth - chatWidth);
    } else {
      // Restore full width when chat is minimized or floating
      setCanvasWidth(undefined);
    }
  }, [chatMode, isFullscreen]);

  // Transform nodes to NVL format with styling and highlighting
  const nvlNodes: NvlNode[] = useMemo(() => {
    const transformed = nodes.map(node => {
      const style = getNodeStyle(node);
      const isHighlighted = chatHighlightedEntities.has(node.id);
      
      // Prioritize common_name, then fall back to other properties
      const caption = 
        node.properties.common_name || 
        node.properties[style.captionProperty] || 
        node.properties.name || 
        node.properties.title ||
        node.id;
      
      return {
        id: node.id,
        caption: String(caption),
        size: isHighlighted ? style.size * 1.3 : style.size,
        color: isHighlighted ? '#FFD700' : style.color, // Gold color for highlighted
        labels: node.labels,
      };
    });
    
    console.log('Transformed NVL nodes:', transformed.length);
    console.log('Sample nodes:', transformed.slice(0, 3));
    console.log('Node IDs:', transformed.slice(0, 5).map(n => n.id));
    return transformed;
  }, [nodes, chatHighlightedEntities]);

  // Transform relationships to NVL format with styling
  const nvlRelationships: NvlRelationship[] = useMemo(() => {
    const transformed = relationships.map(rel => {
      const style = getRelationshipStyle(rel);
      
      return {
        id: rel.id,
        from: rel.startNodeId,
        to: rel.endNodeId,
        caption: style.showLabel ? rel.type : '',
        type: rel.type,
        width: style.width,
        color: style.color,
      };
    });
    
    console.log('Transformed NVL relationships:', transformed.length);
    console.log('Sample relationships:', transformed.slice(0, 3));
    return transformed;
  }, [relationships]);

  // Track click state to distinguish between click and drag
  const clickStateRef = useRef<{ nodeId: string | null; isDragging: boolean }>({
    nodeId: null,
    isDragging: false,
  });

  // Mouse event callbacks for interactions
  const mouseEventCallbacks: MouseEventCallbacks = useMemo(() => ({
    // Enable pan and zoom
    onPan: true,
    onZoom: true,
    
    // Handle node click - show properties modal (only if not dragging)
    onNodeClick: (nvlNode) => {
      // Only show modal if this was a pure click (not a drag)
      if (!clickStateRef.current.isDragging) {
        console.log('NVL node clicked (show properties):', nvlNode.id);
        const node = nodes.find(n => n.id === nvlNode.id);
        if (node) {
          onNodeClick(node);
        }
      }
      // Reset drag state
      clickStateRef.current.isDragging = false;
      clickStateRef.current.nodeId = null;
    },
    
    // Track when dragging starts
    onNodeDrag: (nvlNode: any) => {
      if (clickStateRef.current.nodeId === nvlNode.id) {
        clickStateRef.current.isDragging = true;
      }
    },
    
    // Track node mouse down to detect drag start
    onNodeMouseDown: (nvlNode: any) => {
      clickStateRef.current.nodeId = nvlNode.id;
      clickStateRef.current.isDragging = false;
    },
    
    // Handle node double-click - expand to show adjacent nodes (no modal)
    onNodeDoubleClick: (nvlNode) => {
      console.log('NVL node double-clicked (expand):', nvlNode.id);
      // Prevent the modal from opening on double-click
      clickStateRef.current.isDragging = true;
      const node = nodes.find(n => n.id === nvlNode.id);
      if (node && onNodeExpand) {
        onNodeExpand(node);
      }
    },
    
    // Handle relationship click - display details
    onRelationshipClick: (nvlRelationship) => {
      console.log('NVL relationship clicked:', nvlRelationship.id);
      const relationship = relationships.find(r => r.id === nvlRelationship.id);
      if (relationship) {
        onRelationshipClick(relationship);
      }
    },
  }), [nodes, relationships, onNodeClick, onNodeExpand, onRelationshipClick]);

  // NVL options configuration
  const nvlOptions = useMemo(() => ({
    allowDynamicMinZoom: true,
    disableWebGL: true, // Disable WebGL to avoid worker script errors
    instanceId: 'graph-canvas',
    initialZoom: 1.5,
    maxZoom: 3,
    minZoom: 0.1,
  }), []);

  // Interaction options - enable node dragging
  const interactionOptions = useMemo(() => ({
    selectOnClick: false, // Disable selection to allow dragging
    selectOnBoxZoom: false,
    enableDrag: true,
    dragNodes: true, // Explicitly enable node dragging
  }), []);

  // Debug: Log when component renders
  console.log('GraphCanvas rendering with:', {
    nodeCount: nvlNodes.length,
    relCount: nvlRelationships.length,
    hasNodes: nvlNodes.length > 0,
  });

  // Fullscreen handlers
  const handleFullscreenToggle = useCallback(() => {
    if (!canvasRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (canvasRef.current.requestFullscreen) {
        canvasRef.current.requestFullscreen();
      } else if ('webkitRequestFullscreen' in canvasRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (canvasRef.current as any).webkitRequestFullscreen();
      } else if ('mozRequestFullScreen' in canvasRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (canvasRef.current as any).mozRequestFullScreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ('webkitExitFullscreen' in document) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).webkitExitFullscreen();
      } else if ('mozCancelFullScreen' in document) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).mozCancelFullScreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes (e.g., user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docAny = document as any;
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        docAny.webkitFullscreenElement ||
        docAny.mozFullScreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fit to view handler
  const handleFitToView = useCallback(() => {
    if (nvlRef.current?.fit && nvlRef.current?.getNodes) {
      const allNodes = nvlRef.current.getNodes();
      if (allNodes && allNodes.length > 0) {
        const nodeIds = allNodes.map((n) => n.id);
        nvlRef.current.fit(nodeIds);
      }
    }
  }, []);

  // Reset zoom handler
  const handleResetZoom = useCallback(() => {
    if (nvlRef.current?.resetZoom) {
      nvlRef.current.resetZoom();
    }
  }, []);

  const containerStyle = canvasWidth ? { width: `${canvasWidth}px` } : undefined;

  return (
    <div 
      className={`graph-canvas-container ${isFullscreen ? 'fullscreen' : ''} ${chatMode === 'docked' ? 'chat-docked' : ''}`}
      ref={canvasRef}
      style={containerStyle}
    >
      {nvlNodes.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#888',
          fontSize: '16px',
        }}>
          No nodes to display. Try searching or loading data.
        </div>
      ) : (
        <>
          <InteractiveNvlWrapper
            ref={nvlRef}
            nodes={nvlNodes}
            rels={nvlRelationships}
            nvlOptions={nvlOptions}
            mouseEventCallbacks={mouseEventCallbacks}
            interactionOptions={interactionOptions}
          />
          
          {/* Control buttons */}
          <div className="graph-controls">
            <button
              className="control-button"
              onClick={handleFitToView}
              title="Fit to View"
              aria-label="Fit to View"
            >
              <Maximize2 size={22} strokeWidth={2} />
            </button>
            
            <button
              className="control-button"
              onClick={handleResetZoom}
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw size={22} strokeWidth={2} />
            </button>
            
            <button
              className="control-button"
              onClick={handleFullscreenToggle}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 size={22} strokeWidth={2} />
              ) : (
                <Maximize size={22} strokeWidth={2} />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GraphCanvas;
