import type { NodeStyle, RelationshipStyle, StyleConfiguration, Node, Relationship } from '../types';

/**
 * Node styling configuration for all entity types
 * Based on the existing Popoto implementation color scheme
 */
export const nodeStyleConfig: Record<string, NodeStyle> = {
  // Core Genomic Entities
  Gene: {
    color: '#55efc4',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Transcript: {
    color: '#81ecec',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Protein: {
    color: '#74b9ff',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Exon: {
    color: '#a0d8f1',
    size: 18,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  Intron: {
    color: '#b8e6f5',
    size: 18,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  
  // Disease and Clinical Entities
  Disease: {
    color: '#a29bfe',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Symptom: {
    color: '#b8a9fe',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  Syndrome: {
    color: '#c5b7fe',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Phenotype: {
    color: '#6c5ce7',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  
  // Pathways and Processes
  Pathway: {
    color: '#fd79a8',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  BiologicalProcess: {
    color: '#fab1a0',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  MolecularFunction: {
    color: '#ff7675',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  CellularComponent: {
    color: '#ffeaa7',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  
  // Chemical Entities
  Compound: {
    color: '#fdcb6e',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Drug: {
    color: '#e17055',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Metabolite: {
    color: '#f39c6b',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  ChemicalSubstance: {
    color: '#fad390',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  
  // Anatomical Entities
  Tissue: {
    color: '#00b894',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Organ: {
    color: '#00a383',
    size: 21,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  CellType: {
    color: '#00cec9',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  CellLine: {
    color: '#1dd1a1',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  AnatomicalStructure: {
    color: '#26de81',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  
  // Molecular Entities
  RNA: {
    color: '#5f9edb',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  DNA: {
    color: '#4a89dc',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  Enzyme: {
    color: '#3867d6',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Receptor: {
    color: '#4b7bec',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Antibody: {
    color: '#778beb',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  
  // Variants and Mutations
  Variant: {
    color: '#e55039',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  SNP: {
    color: '#eb2f06',
    size: 18,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  Mutation: {
    color: '#fa983a',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  
  // Taxonomic and Organism Entities
  Organism: {
    color: '#dfe6e9',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Species: {
    color: '#b2bec3',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Strain: {
    color: '#95a5a6',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  
  // Research and Reference Entities
  Publication: {
    color: '#b2bec3',
    size: 20,
    shape: 'circle',
    captionProperty: 'title',
    fontSize: 12,
  },
  ClinicalTrial: {
    color: '#a4b0be',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Experiment: {
    color: '#8395a7',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  
  // Additional Biomedical Entities
  Biomarker: {
    color: '#f8b500',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  Treatment: {
    color: '#ee5a6f',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  Therapy: {
    color: '#f368e0',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
  SideEffect: {
    color: '#ff6348',
    size: 19,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 11,
  },
  
  // Default style for unknown node types
  default: {
    color: '#636e72',
    size: 20,
    shape: 'circle',
    captionProperty: 'name',
    fontSize: 12,
  },
};

/**
 * Relationship styling configuration for all relationship types
 * Comprehensive configuration for biomedical knowledge graph relationships
 */
export const relationshipStyleConfig: Record<string, RelationshipStyle> = {
  // Gene and Protein Relationships
  ENCODES: {
    color: '#74b9ff',
    width: 2,
    showLabel: true,
    arrowEnabled: true,
  },
  TRANSCRIBES_TO: {
    color: '#81ecec',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  TRANSLATES_TO: {
    color: '#74b9ff',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  EXPRESSES: {
    color: '#55efc4',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Interaction Relationships
  INTERACTS_WITH: {
    color: '#a29bfe',
    width: 1.5,
    showLabel: true,
    arrowEnabled: false,
  },
  BINDS_TO: {
    color: '#fd79a8',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  PHOSPHORYLATES: {
    color: '#fab1a0',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  ACTIVATES: {
    color: '#00b894',
    width: 2,
    showLabel: true,
    arrowEnabled: true,
  },
  INHIBITS: {
    color: '#e17055',
    width: 2,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Regulatory Relationships
  REGULATES: {
    color: '#fdcb6e',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  UPREGULATES: {
    color: '#00b894',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  DOWNREGULATES: {
    color: '#d63031',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  MODULATES: {
    color: '#ffeaa7',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Disease and Clinical Relationships
  ASSOCIATED_WITH: {
    color: '#b2bec3',
    width: 1,
    showLabel: true,
    arrowEnabled: false,
  },
  CAUSES: {
    color: '#e55039',
    width: 2,
    showLabel: true,
    arrowEnabled: true,
  },
  TREATS: {
    color: '#4b7bec',
    width: 2,
    showLabel: true,
    arrowEnabled: true,
  },
  PREVENTS: {
    color: '#26de81',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  DIAGNOSES: {
    color: '#778beb',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  INDICATES: {
    color: '#95a5a6',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  PREDISPOSES_TO: {
    color: '#fa983a',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Pathway and Process Relationships
  PARTICIPATES_IN: {
    color: '#fd79a8',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  PART_OF: {
    color: '#dfe6e9',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  HAS_PART: {
    color: '#b2bec3',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  INVOLVED_IN: {
    color: '#fab1a0',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Drug and Chemical Relationships
  TARGETS: {
    color: '#e17055',
    width: 2,
    showLabel: true,
    arrowEnabled: true,
  },
  METABOLIZES: {
    color: '#fdcb6e',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  TRANSPORTS: {
    color: '#00cec9',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  ACTS_ON: {
    color: '#ff7675',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Anatomical and Localization Relationships
  LOCATED_IN: {
    color: '#00b894',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  EXPRESSED_IN: {
    color: '#00cec9',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  FOUND_IN: {
    color: '#1dd1a1',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Variant and Mutation Relationships
  HAS_VARIANT: {
    color: '#e55039',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  MUTATES_TO: {
    color: '#eb2f06',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  AFFECTS: {
    color: '#fa983a',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Taxonomic and Hierarchical Relationships
  IS_A: {
    color: '#636e72',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  SUBCLASS_OF: {
    color: '#636e72',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  INSTANCE_OF: {
    color: '#2d3436',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Similarity and Comparison Relationships
  SIMILAR_TO: {
    color: '#a4b0be',
    width: 1,
    showLabel: true,
    arrowEnabled: false,
  },
  HOMOLOGOUS_TO: {
    color: '#8395a7',
    width: 1,
    showLabel: true,
    arrowEnabled: false,
  },
  ORTHOLOGOUS_TO: {
    color: '#778ca3',
    width: 1,
    showLabel: true,
    arrowEnabled: false,
  },
  PARALOGOUS_TO: {
    color: '#4b6584',
    width: 1,
    showLabel: true,
    arrowEnabled: false,
  },
  
  // Cooccurrence and Correlation Relationships
  COOCCURS_WITH: {
    color: '#dfe6e9',
    width: 1,
    showLabel: true,
    arrowEnabled: false,
  },
  CORRELATES_WITH: {
    color: '#b2bec3',
    width: 1,
    showLabel: true,
    arrowEnabled: false,
  },
  
  // Research and Evidence Relationships
  MENTIONED_IN: {
    color: '#95a5a6',
    width: 0.5,
    showLabel: false,
    arrowEnabled: true,
  },
  CITED_BY: {
    color: '#7f8c8d',
    width: 0.5,
    showLabel: false,
    arrowEnabled: true,
  },
  SUPPORTED_BY: {
    color: '#a4b0be',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Side Effect and Adverse Event Relationships
  HAS_SIDE_EFFECT: {
    color: '#ff6348',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  CONTRAINDICATES: {
    color: '#d63031',
    width: 1.5,
    showLabel: true,
    arrowEnabled: true,
  },
  
  // Default style for unknown relationship types
  default: {
    color: '#FFFFFF',
    width: 1,
    showLabel: true,
    arrowEnabled: true,
  },
};

/**
 * Get node style based on node labels
 * Returns the style for the first matching label, or default style
 */
export const getNodeStyle = (node: Node): NodeStyle => {
  for (const label of node.labels) {
    if (nodeStyleConfig[label]) {
      return nodeStyleConfig[label];
    }
  }
  return nodeStyleConfig.default;
};

/**
 * Get relationship style based on relationship type
 */
export const getRelationshipStyle = (relationship: Relationship): RelationshipStyle => {
  return relationshipStyleConfig[relationship.type] || relationshipStyleConfig.default;
};

/**
 * Complete style configuration object
 */
export const styleConfiguration: StyleConfiguration = {
  nodeStyles: nodeStyleConfig,
  relationshipStyles: relationshipStyleConfig,
};
