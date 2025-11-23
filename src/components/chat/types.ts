/**
 * Type definitions for Chat Interface components
 */

export type ChatMode = 'docked' | 'floating' | 'minimized';

export type EntityType = 'Drug' | 'Disease' | 'ClinicalDisease' | 'Protein';

export interface EntityMention {
  text: string;
  type: EntityType;
  nodeId: string;
  startIndex: number;
  endIndex: number;
}

export interface Source {
  entityType: EntityType;
  entityName: string;
  nodeId: string;
  relevanceScore: number;
  excerpt: string;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    labels: string[];
    properties: Record<string, any>;
  }>;
  relationships: Array<{
    id: string;
    type: string;
    startNodeId: string;
    endNodeId: string;
    properties: Record<string, any>;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  graphData?: GraphData;
  entities?: EntityMention[];
}

export interface ChatInterfaceProps {
  isOpen: boolean;
  mode?: ChatMode;
  onClose: () => void;
  onModeChange?: (mode: ChatMode) => void;
  onEntityClick: (entityId: string, entityType: EntityType) => void;
  onShowInGraph: (graphData: GraphData) => void;
}

export interface ChatPosition {
  x: number;
  y: number;
}

export interface ChatSize {
  width: number;
  height: number;
}

export interface ChatHeaderProps {
  mode: ChatMode;
  onMinimize: () => void;
  onClose: () => void;
  onToggleMode: () => void;
}

export interface ChatMessagesProps {
  messages: ChatMessage[];
  onEntityClick: (entityId: string, entityType: EntityType) => void;
  onShowInGraph: (graphData: GraphData) => void;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}
