/**
 * OpenAI Service for Natural Language to Cypher Query Conversion
 * Integrates with OpenAI API to convert natural language queries into Cypher queries
 */

import { config } from '../config/env';
import { ErrorType, type AppError } from '../types';

/**
 * Schema context for the biomedical knowledge graph
 * Provides GPT with information about available node types, relationships, and query patterns
 */
const SCHEMA_CONTEXT = `You are a Neo4j Cypher query expert for a biomedical knowledge graph. Your task is to convert natural language questions into valid Cypher queries.

## Available Node Labels (Entity Types):

### Core Genomic Entities:
- Gene: Genetic sequences (properties: name, symbol, description)
- Transcript: RNA transcripts (properties: name, type)
- Protein: Protein molecules (properties: name, function)
- Exon, Intron: Gene components
- RNA, DNA: Nucleic acid molecules
- Enzyme: Catalytic proteins
- Receptor: Receptor proteins
- Antibody: Antibody molecules

### Disease and Clinical Entities:
- Disease: Medical conditions (properties: name, description)
- Symptom: Clinical symptoms
- Syndrome: Symptom clusters
- Phenotype: Observable characteristics
- Biomarker: Disease indicators
- Treatment: Medical treatments
- Therapy: Therapeutic interventions
- SideEffect: Adverse effects

### Pathways and Processes:
- Pathway: Biological pathways (properties: name, description)
- BiologicalProcess: GO biological processes
- MolecularFunction: GO molecular functions
- CellularComponent: GO cellular components

### Chemical Entities:
- Compound: Chemical compounds
- Drug: Pharmaceutical drugs (properties: name, indication)
- Metabolite: Metabolic products
- ChemicalSubstance: Chemical substances

### Anatomical Entities:
- Tissue: Body tissues
- Organ: Body organs
- CellType: Cell types
- CellLine: Cell lines
- AnatomicalStructure: Anatomical structures

### Variants and Mutations:
- Variant: Genetic variants
- SNP: Single nucleotide polymorphisms
- Mutation: Genetic mutations

### Taxonomic Entities:
- Organism: Organisms
- Species: Species
- Strain: Organism strains

### Research Entities:
- Publication: Scientific publications (properties: title, authors, year)
- ClinicalTrial: Clinical trials
- Experiment: Experimental data

## Available Relationship Types:

### Gene and Protein Relationships:
- ENCODES: Gene encodes protein
- TRANSCRIBES_TO: Gene transcribes to transcript
- TRANSLATES_TO: Transcript translates to protein
- EXPRESSES: Expression relationships

### Interaction Relationships:
- INTERACTS_WITH: Molecular interactions
- BINDS_TO: Binding relationships
- PHOSPHORYLATES: Phosphorylation
- ACTIVATES: Activation
- INHIBITS: Inhibition

### Regulatory Relationships:
- REGULATES: General regulation
- UPREGULATES: Positive regulation
- DOWNREGULATES: Negative regulation
- MODULATES: Modulation

### Disease and Clinical Relationships:
- ASSOCIATED_WITH: General associations
- CAUSES: Causal relationships
- TREATS: Treatment relationships
- PREVENTS: Prevention
- DIAGNOSES: Diagnostic relationships
- INDICATES: Indication
- PREDISPOSES_TO: Predisposition

### Pathway and Process Relationships:
- PARTICIPATES_IN: Participation in pathways/processes
- PART_OF: Component relationships
- HAS_PART: Composition
- INVOLVED_IN: Involvement

### Drug and Chemical Relationships:
- TARGETS: Drug targets
- METABOLIZES: Metabolism
- TRANSPORTS: Transport
- ACTS_ON: Action on targets

### Anatomical and Localization:
- LOCATED_IN: Location
- EXPRESSED_IN: Expression location
- FOUND_IN: Presence

### Variant and Mutation:
- HAS_VARIANT: Variant relationships
- MUTATES_TO: Mutation
- AFFECTS: Effect relationships

### Taxonomic and Hierarchical:
- IS_A: Type relationships
- SUBCLASS_OF: Subclass
- INSTANCE_OF: Instance

### Similarity:
- SIMILAR_TO: Similarity
- HOMOLOGOUS_TO: Homology
- ORTHOLOGOUS_TO: Orthology
- PARALOGOUS_TO: Paralogy

### Research:
- MENTIONED_IN: Publication mentions
- CITED_BY: Citations
- SUPPORTED_BY: Evidence support

## Query Guidelines:

1. Always use MATCH clauses to find nodes
2. Use WHERE clauses for filtering
3. Use RETURN to specify what to return
4. Limit results to reasonable numbers (default 50, max 100)
5. Use case-insensitive matching with toLower() or =~ for text searches
6. Return both nodes and relationships when exploring connections
7. Use variable names that are descriptive (e.g., gene, protein, disease)

## Example Queries:

Q: "Show me genes related to cancer"
A: MATCH (g:Gene)-[r:ASSOCIATED_WITH]->(d:Disease) WHERE toLower(d.name) CONTAINS 'cancer' RETURN g, r, d LIMIT 50

Q: "Find proteins that interact with TP53"
A: MATCH (p1:Protein {name: 'TP53'})-[r:INTERACTS_WITH]-(p2:Protein) RETURN p1, r, p2 LIMIT 50

Q: "What drugs treat diabetes?"
A: MATCH (drug:Drug)-[r:TREATS]->(d:Disease) WHERE toLower(d.name) CONTAINS 'diabetes' RETURN drug, r, d LIMIT 50

Q: "Show pathways involving BRCA1"
A: MATCH (g:Gene {symbol: 'BRCA1'})-[r:PARTICIPATES_IN]->(p:Pathway) RETURN g, r, p LIMIT 50

Q: "Find genes and their proteins"
A: MATCH (g:Gene)-[r:ENCODES]->(p:Protein) RETURN g, r, p LIMIT 50

Q: "What are the side effects of aspirin?"
A: MATCH (d:Drug)-[r:HAS_SIDE_EFFECT]->(s:SideEffect) WHERE toLower(d.name) CONTAINS 'aspirin' RETURN d, r, s LIMIT 50

## Important Rules:

1. ALWAYS return relationships (r) along with nodes to visualize connections
2. Use LIMIT to prevent overwhelming results (default 50)
3. For text searches, use toLower() and CONTAINS for flexibility
4. When searching by name/symbol, try both exact match and CONTAINS
5. Return the pattern (nodes and relationships) not just individual elements
6. Keep queries simple and focused on visualization
7. Avoid complex aggregations or computations

Now convert the following natural language query to a Cypher query. Return ONLY the Cypher query, no explanations or markdown formatting.`;

/**
 * OpenAI Query Service
 * Handles conversion of natural language to Cypher queries using OpenAI API
 */
export class OpenAIService {
  private apiKey: string;
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private model = 'gpt-4.1';
  private maxTokens = 1024; // Increased to prevent query truncation
  private temperature = 0.0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.openai.apiKey;
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured. Natural language search will not work.');
    }
  }

  /**
   * Generate a Cypher query from a natural language question
   * @param naturalLanguageQuery - The user's question in plain English
   * @param dynamicSchema - Optional dynamic schema from the database
   * @returns Promise resolving to the generated Cypher query
   * @throws AppError if the API call fails or returns invalid data
   */
  async generateCypherQuery(naturalLanguageQuery: string, dynamicSchema?: string): Promise<string> {
    if (!this.apiKey) {
      throw this.createError(
        'OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.',
        'API_KEY_MISSING'
      );
    }

    if (!naturalLanguageQuery.trim()) {
      throw this.createError(
        'Query cannot be empty',
        'EMPTY_QUERY'
      );
    }

    try {
      // Use dynamic schema if provided, otherwise use default schema context
      const schemaContext = dynamicSchema 
        ? `${SCHEMA_CONTEXT}\n\n${dynamicSchema}`
        : SCHEMA_CONTEXT;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: schemaContext,
            },
            {
              role: 'user',
              content: naturalLanguageQuery,
            },
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createError(
          this.getErrorMessage(response.status, errorData),
          'API_ERROR',
          { status: response.status, errorData }
        );
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw this.createError(
          'No response generated from OpenAI',
          'EMPTY_RESPONSE',
          data
        );
      }

      const cypherQuery = this.extractCypherQuery(data.choices[0].message.content);
      
      if (!cypherQuery) {
        throw this.createError(
          'Failed to extract valid Cypher query from response',
          'INVALID_RESPONSE',
          { response: data.choices[0].message.content }
        );
      }

      return cypherQuery;
    } catch (error) {
      // If it's already an AppError, rethrow it
      if (this.isAppError(error)) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw this.createError(
          'Network error: Unable to connect to OpenAI API. Please check your internet connection.',
          'NETWORK_ERROR',
          error
        );
      }

      // Handle other unexpected errors
      throw this.createError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  /**
   * Extract and clean the Cypher query from GPT response
   * Removes markdown code blocks, extra whitespace, and explanations
   */
  private extractCypherQuery(response: string): string {
    let query = response.trim();

    // Remove markdown code blocks
    query = query.replace(/```cypher\n?/gi, '');
    query = query.replace(/```\n?/g, '');

    // Remove any explanatory text before or after the query
    // Look for lines that start with MATCH, CREATE, MERGE, etc.
    const cypherKeywords = /^(MATCH|CREATE|MERGE|RETURN|WITH|WHERE|OPTIONAL|CALL|UNWIND)/i;
    const lines = query.split('\n');
    const cypherLines: string[] = [];
    let inQuery = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Start capturing when we hit a Cypher keyword
      if (cypherKeywords.test(trimmedLine)) {
        inQuery = true;
      }

      // Capture lines that are part of the query
      if (inQuery && trimmedLine) {
        cypherLines.push(trimmedLine);
      }

      // Stop if we hit an empty line after starting the query
      if (inQuery && !trimmedLine && cypherLines.length > 0) {
        break;
      }
    }

    // Join the lines and clean up
    query = cypherLines.join(' ').trim();

    // Fix truncated LIMIT keyword (common with token limits)
    query = query.replace(/\s+LIM$/i, ' LIMIT 50');
    query = query.replace(/\s+LIMI$/i, ' LIMIT 50');
    
    // If query ends with RETURN but no LIMIT, add default LIMIT
    if (/RETURN\s+[^;]+$/i.test(query) && !/LIMIT\s+\d+/i.test(query)) {
      query += ' LIMIT 50';
    }

    // Remove any trailing explanations (text after the query)
    // Only remove text if there's clearly explanatory text after the query
    // Look for patterns like ". This query..." or "; Note that..."
    const explanationPattern = /^(.+?)[\s;.]+(?:This|The|Note|Explanation|Here|Above|Query)\s+/i;
    const queryEndMatch = query.match(explanationPattern);
    if (queryEndMatch) {
      query = queryEndMatch[1].trim();
    }

    // Remove trailing semicolons or periods
    query = query.replace(/[;.]+$/, '').trim();

    return query;
  }

  /**
   * Get user-friendly error message based on HTTP status code
   */
  private getErrorMessage(status: number, errorData: any): string {
    switch (status) {
      case 401:
        return 'Invalid OpenAI API key. Please check your configuration.';
      case 429:
        return 'OpenAI API rate limit exceeded. Please try again later.';
      case 500:
      case 502:
      case 503:
        return 'OpenAI service is temporarily unavailable. Please try again later.';
      case 400:
        if (errorData?.error?.message) {
          return `Invalid request: ${errorData.error.message}`;
        }
        return 'Invalid request to OpenAI API.';
      default:
        if (errorData?.error?.message) {
          return `OpenAI API error: ${errorData.error.message}`;
        }
        return `OpenAI API error (status ${status})`;
    }
  }

  /**
   * Create an AppError with GPT_ERROR type
   */
  private createError(message: string, code: string, details?: any): AppError {
    return {
      type: ErrorType.GPT_ERROR,
      message,
      details: {
        code,
        ...details,
      },
    };
  }

  /**
   * Type guard to check if an error is an AppError
   */
  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'message' in error;
  }

  /**
   * Validate that a string looks like a Cypher query
   * Basic validation to ensure the response contains Cypher keywords
   */
  validateCypherQuery(query: string): boolean {
    const trimmed = query.trim().toUpperCase();
    const hasMatch = trimmed.includes('MATCH');
    const hasReturn = trimmed.includes('RETURN');
    return hasMatch && hasReturn;
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
