import { describe, it, expect } from 'vitest';
import { getNodeStyle, getRelationshipStyle, nodeStyleConfig, relationshipStyleConfig } from './styleConfig';
import type { Node, Relationship } from '../types';

describe('styleConfig utilities', () => {
  describe('getNodeStyle', () => {
    it('should return correct style for Gene node', () => {
      const node: Node = {
        id: '1',
        labels: ['Gene'],
        properties: { name: 'TP53' },
      };

      const style = getNodeStyle(node);

      expect(style.color).toBe('#55efc4');
      expect(style.shape).toBe('circle');
      expect(style.captionProperty).toBe('name');
    });

    it('should return correct style for Protein node', () => {
      const node: Node = {
        id: '2',
        labels: ['Protein'],
        properties: { name: 'P53' },
      };

      const style = getNodeStyle(node);

      expect(style.color).toBe('#74b9ff');
      expect(style.shape).toBe('circle');
    });

    it('should return correct style for Disease node', () => {
      const node: Node = {
        id: '3',
        labels: ['Disease'],
        properties: { name: 'Cancer' },
      };

      const style = getNodeStyle(node);

      expect(style.color).toBe('#a29bfe');
      expect(style.shape).toBe('circle');
    });

    it('should return correct style for Drug node', () => {
      const node: Node = {
        id: '4',
        labels: ['Drug'],
        properties: { name: 'Aspirin' },
      };

      const style = getNodeStyle(node);

      expect(style.color).toBe('#e17055');
    });

    it('should return correct style for Pathway node', () => {
      const node: Node = {
        id: '5',
        labels: ['Pathway'],
        properties: { name: 'MAPK signaling' },
      };

      const style = getNodeStyle(node);

      expect(style.color).toBe('#fd79a8');
    });

    it('should return default style for unknown node type', () => {
      const node: Node = {
        id: '6',
        labels: ['UnknownType'],
        properties: { name: 'Unknown' },
      };

      const style = getNodeStyle(node);

      expect(style).toEqual(nodeStyleConfig.default);
      expect(style.color).toBe('#636e72');
    });

    it('should return first matching style for node with multiple labels', () => {
      const node: Node = {
        id: '7',
        labels: ['Gene', 'Protein'],
        properties: { name: 'Test' },
      };

      const style = getNodeStyle(node);

      expect(style.color).toBe('#55efc4'); // Gene color
    });

    it('should handle node with empty labels array', () => {
      const node: Node = {
        id: '8',
        labels: [],
        properties: { name: 'Test' },
      };

      const style = getNodeStyle(node);

      expect(style).toEqual(nodeStyleConfig.default);
    });
  });

  describe('getRelationshipStyle', () => {
    it('should return correct style for ENCODES relationship', () => {
      const relationship: Relationship = {
        id: '10',
        type: 'ENCODES',
        startNodeId: '1',
        endNodeId: '2',
        properties: {},
      };

      const style = getRelationshipStyle(relationship);

      expect(style.color).toBe('#74b9ff');
      expect(style.width).toBe(2);
      expect(style.showLabel).toBe(true);
      expect(style.arrowEnabled).toBe(true);
    });

    it('should return correct style for INTERACTS_WITH relationship', () => {
      const relationship: Relationship = {
        id: '11',
        type: 'INTERACTS_WITH',
        startNodeId: '1',
        endNodeId: '2',
        properties: {},
      };

      const style = getRelationshipStyle(relationship);

      expect(style.color).toBe('#a29bfe');
      expect(style.arrowEnabled).toBe(false);
    });

    it('should return correct style for TREATS relationship', () => {
      const relationship: Relationship = {
        id: '12',
        type: 'TREATS',
        startNodeId: '1',
        endNodeId: '2',
        properties: {},
      };

      const style = getRelationshipStyle(relationship);

      expect(style.color).toBe('#4b7bec');
      expect(style.width).toBe(2);
    });

    it('should return correct style for ACTIVATES relationship', () => {
      const relationship: Relationship = {
        id: '13',
        type: 'ACTIVATES',
        startNodeId: '1',
        endNodeId: '2',
        properties: {},
      };

      const style = getRelationshipStyle(relationship);

      expect(style.color).toBe('#00b894');
      expect(style.width).toBe(2);
    });

    it('should return correct style for INHIBITS relationship', () => {
      const relationship: Relationship = {
        id: '14',
        type: 'INHIBITS',
        startNodeId: '1',
        endNodeId: '2',
        properties: {},
      };

      const style = getRelationshipStyle(relationship);

      expect(style.color).toBe('#e17055');
      expect(style.width).toBe(2);
    });

    it('should return default style for unknown relationship type', () => {
      const relationship: Relationship = {
        id: '15',
        type: 'UNKNOWN_TYPE',
        startNodeId: '1',
        endNodeId: '2',
        properties: {},
      };

      const style = getRelationshipStyle(relationship);

      expect(style).toEqual(relationshipStyleConfig.default);
      expect(style.color).toBe('#FFFFFF');
      expect(style.width).toBe(1);
    });
  });

  describe('nodeStyleConfig', () => {
    it('should have styles for all major entity types', () => {
      const expectedTypes = [
        'Gene',
        'Protein',
        'Disease',
        'Drug',
        'Pathway',
        'Compound',
        'Tissue',
        'CellType',
        'Variant',
        'Publication',
      ];

      expectedTypes.forEach(type => {
        expect(nodeStyleConfig[type]).toBeDefined();
        expect(nodeStyleConfig[type].color).toBeTruthy();
        expect(nodeStyleConfig[type].shape).toBeTruthy();
      });
    });

    it('should have default style', () => {
      expect(nodeStyleConfig.default).toBeDefined();
      expect(nodeStyleConfig.default.color).toBe('#636e72');
    });
  });

  describe('relationshipStyleConfig', () => {
    it('should have styles for all major relationship types', () => {
      const expectedTypes = [
        'ENCODES',
        'INTERACTS_WITH',
        'TREATS',
        'ACTIVATES',
        'INHIBITS',
        'ASSOCIATED_WITH',
        'PARTICIPATES_IN',
        'TARGETS',
      ];

      expectedTypes.forEach(type => {
        expect(relationshipStyleConfig[type]).toBeDefined();
        expect(relationshipStyleConfig[type].color).toBeTruthy();
        expect(typeof relationshipStyleConfig[type].width).toBe('number');
      });
    });

    it('should have default style', () => {
      expect(relationshipStyleConfig.default).toBeDefined();
      expect(relationshipStyleConfig.default.color).toBe('#FFFFFF');
    });
  });
});
