/**
 * OpenAI Proxy Service
 * Handles OpenAI API requests with server-side credentials
 */

import { config } from '../config/env';

interface GenerateQueryRequest {
  query: string;
  schema?: string;
}

interface GenerateQueryResponse {
  cypherQuery: string;
}

interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIChoice {
  message: OpenAIMessage;
  finish_reason: string;
  index: number;
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
  created: number;
  id: string;
  model: string;
}

/**
 * Build dynamic schema context from actual database schema
 */
function buildSchemaContext(dynamicSchema?: string): string {
  if (!dynamicSchema) {
    return buildFallbackSchemaContext();
  }

  // Parse the dynamic schema to extract key information
  const schemaLines = dynamicSchema.split('\n');
  const relationshipPatterns: string[] = [];
  let inPatterns = false;

  for (const line of schemaLines) {
    if (line.includes('### Relationship Patterns:')) {
      inPatterns = true;
      continue;
    }
    if (inPatterns && line.startsWith('- (')) {
      relationshipPatterns.push(line.substring(2)); // Remove "- " prefix
    }
    if (inPatterns && line.startsWith('###')) {
      break;
    }
  }

  return `You are a Neo4j Cypher query expert for a biomedical knowledge graph with drugs, diseases, proteins, and genes. Your task is to convert natural language questions into valid Cypher queries.

${dynamicSchema}

## CRITICAL: Drug-Disease-Protein Knowledge Graph

**NEW ENTITIES AVAILABLE:**
- **Drug**: Pharmaceutical compounds (7,957 nodes)
  - Properties: name, indication, mechanism_of_action, molecular_weight, half_life, pharmacodynamics
  - Relationships: TREATS (Disease/ClinicalDisease), INTERACTS_WITH (Protein)

- **Disease**: Medical conditions with DOID identifiers (10,791 nodes)
  - Properties: name, description, mondo_id, mayo_symptoms, orphanet_prevalence
  - Enriched with clinical data from Mayo Clinic and Orphanet

- **ClinicalDisease**: MONDO-only diseases (23,551 nodes)
  - Properties: name, mondo_definition, mayo_symptoms, orphanet_prevalence
  - Same relationships as Disease

## CRITICAL: Multi-Hop Path Rules

**IMPORTANT**: Many relationships require MULTIPLE HOPS to connect entities. Always check the relationship patterns above before creating a query.

### Common Multi-Hop Patterns:

**Gene to Disease** (NO direct relationship exists):
- Pattern: (Gene)-[TRANSCRIBED_INTO]->(Transcript)-[TRANSLATED_INTO]->(Protein)-[ASSOCIATED_WITH]-(Disease)
- Example: MATCH (gene:Gene)-[:TRANSCRIBED_INTO]->(t:Transcript)-[:TRANSLATED_INTO]->(p:Protein)-[:ASSOCIATED_WITH]-(d:Disease) WHERE toLower(d.name) CONTAINS 'cancer' RETURN gene, t, p, d LIMIT 50

**Gene to Pathway** (through Protein):
- Pattern: (Gene)-[TRANSCRIBED_INTO]->(Transcript)-[TRANSLATED_INTO]->(Protein)-[ANNOTATED_IN_PATHWAY]->(Pathway)
- Example: MATCH (gene:Gene)-[:TRANSCRIBED_INTO]->(t:Transcript)-[:TRANSLATED_INTO]->(p:Protein)-[:ANNOTATED_IN_PATHWAY]->(pathway:Pathway) RETURN gene, t, p, pathway LIMIT 50

**Protein Interactions** (direct relationship exists):
- Pattern: (Protein)-[CURATED_INTERACTS_WITH]-(Protein)
- Example: MATCH (p1:Protein)-[r:CURATED_INTERACTS_WITH]-(p2:Protein) WHERE p1.name = 'TP53' RETURN p1, r, p2 LIMIT 50

**Protein to Disease** (direct relationship exists):
- Pattern: (Protein)-[ASSOCIATED_WITH]-(Disease)
- Example: MATCH (p:Protein)-[r:ASSOCIATED_WITH]-(d:Disease) WHERE toLower(d.name) CONTAINS 'cancer' RETURN p, r, d LIMIT 50

**Drug to Disease** (direct relationship exists):
- Pattern: (Drug)-[TREATS]->(Disease|ClinicalDisease)
- Example: MATCH (d:Drug)-[r:TREATS]->(disease) WHERE toLower(disease.name) CONTAINS 'diabetes' RETURN d, r, disease LIMIT 50

**Drug to Protein** (direct relationship exists):
- Pattern: (Drug)-[INTERACTS_WITH]->(Protein)
- Example: MATCH (d:Drug)-[r:INTERACTS_WITH]->(p:Protein) WHERE d.name = 'Aspirin' RETURN d, r, p LIMIT 50

**Drug Mechanism (multi-hop)**:
- Pattern: (Drug)-[INTERACTS_WITH]->(Protein)-[ASSOCIATED_WITH]->(Disease)
- Example: MATCH (d:Drug)-[r1:INTERACTS_WITH]->(p:Protein)-[r2:ASSOCIATED_WITH]->(disease:Disease) WHERE d.name = 'Aspirin' RETURN d, r1, p, r2, disease LIMIT 50

## Query Construction Rules:

1. **Check relationship patterns first** - Look at the "Relationship Patterns" section above to find the correct path
2. **Use multi-hop paths when needed** - If no direct relationship exists, chain multiple relationships
3. **Include ALL intermediate nodes** - Return the complete path (gene, transcript, protein, disease)
4. **Use variable-length paths for exploration** - Use [*1..3] when you're not sure of the exact path
5. **Always include LIMIT** - Default to 50, maximum 100
6. **Return full paths** - Include all nodes and relationships: RETURN gene, r1, protein, r2, disease
7. **Case-insensitive text search** - Use toLower() and CONTAINS for name searches
8. **Undirected relationships** - Use - instead of -> when direction doesn't matter

## Example Queries Based on Actual Schema:

Q: "Show me genes related to cancer"
A: MATCH (gene:Gene)-[:TRANSCRIBED_INTO]->(t:Transcript)-[:TRANSLATED_INTO]->(p:Protein)-[:ASSOCIATED_WITH]-(d:Disease) WHERE toLower(d.name) CONTAINS 'cancer' RETURN gene, t, p, d LIMIT 50

Q: "Find proteins that interact with each other"
A: MATCH (p1:Protein)-[r:CURATED_INTERACTS_WITH]-(p2:Protein) RETURN p1, r, p2 LIMIT 50

Q: "What proteins are biomarkers for diseases?"
A: MATCH (p:Protein)-[r:IS_BIOMARKER_OF_DISEASE]->(d:Disease) RETURN p, r, d LIMIT 50

Q: "Show me genes and their transcripts"
A: MATCH (gene:Gene)-[r:TRANSCRIBED_INTO]->(t:Transcript) RETURN gene, r, t LIMIT 50

Q: "Find proteins in pathways"
A: MATCH (p:Protein)-[r:ANNOTATED_IN_PATHWAY]->(pathway:Pathway) RETURN p, r, pathway LIMIT 50

Q: "Show variants in genes"
A: MATCH (v:Known_variant)-[r:VARIANT_FOUND_IN_GENE]->(g:Gene) RETURN v, r, g LIMIT 50

Q: "What drugs treat diabetes?"
A: MATCH (d:Drug)-[r:TREATS]->(disease) WHERE toLower(disease.name) CONTAINS 'diabetes' RETURN d, r, disease LIMIT 50

Q: "Show me drugs and their protein targets"
A: MATCH (d:Drug)-[r:INTERACTS_WITH]->(p:Protein) RETURN d, r, p LIMIT 50

Q: "Find drugs that target proteins associated with cancer"
A: MATCH (d:Drug)-[r1:INTERACTS_WITH]->(p:Protein)-[r2:ASSOCIATED_WITH]->(disease:Disease) WHERE toLower(disease.name) CONTAINS 'cancer' RETURN d, r1, p, r2, disease LIMIT 50

Q: "What is the mechanism of action for Aspirin?"
A: MATCH (d:Drug {name: 'Aspirin'})-[r:INTERACTS_WITH]->(p:Protein) RETURN d, r, p, d.mechanism_of_action AS mechanism LIMIT 50

Q: "Find drugs with similar targets to Metformin"
A: MATCH (d1:Drug {name: 'Metformin'})-[:INTERACTS_WITH]->(p:Protein)<-[:INTERACTS_WITH]-(d2:Drug) WHERE d1 <> d2 RETURN d1, p, d2 LIMIT 50

Q: "Show diseases with symptoms and available treatments"
A: MATCH (disease:Disease)<-[r:TREATS]-(d:Drug) WHERE disease.mayo_symptoms IS NOT NULL RETURN disease, r, d, disease.mayo_symptoms AS symptoms LIMIT 50

Now convert the following natural language query to a Cypher query. Return ONLY the Cypher query, no explanations or markdown formatting.`;
}

/**
 * Fallback schema context when dynamic schema is not available
 */
function buildFallbackSchemaContext(): string {
  return `You are a Neo4j Cypher query expert for a biomedical knowledge graph.

## Important: This is a FALLBACK schema. The actual database schema should be provided dynamically.

## Basic Query Rules:

1. Use MATCH to find patterns
2. Use WHERE for filtering
3. Always include LIMIT (default 50, max 100)
4. Return both nodes and relationships
5. Use toLower() for case-insensitive text matching
6. Many relationships require multiple hops - use variable-length paths [*1..3] when unsure

## Generic Query Template:

For finding connections between entities:
MATCH path = (start)-[*1..3]-(end)
WHERE <conditions>
RETURN path
LIMIT 50

Now convert the following natural language query to a Cypher query. Return ONLY the Cypher query.`;
}

export class OpenAIProxyService {
  private apiKey: string;
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private model: string;
  private maxTokens: number;
  private temperature = 0.0;

  constructor() {
    this.apiKey = config.openai.apiKey;
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateCypherQuery(request: GenerateQueryRequest): Promise<GenerateQueryResponse> {
    if (!this.isConfigured()) {
      throw {
        type: 'OPENAI_NOT_CONFIGURED',
        message: 'OpenAI API key is not configured',
        statusCode: 503
      };
    }

    if (!request.query?.trim()) {
      throw {
        type: 'VALIDATION_ERROR',
        message: 'Query cannot be empty',
        statusCode: 400
      };
    }

    const schemaContext = buildSchemaContext(request.schema);

    try {
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
              content: request.query,
            },
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          type: 'OPENAI_API_ERROR',
          message: this.getErrorMessage(response.status, errorData),
          statusCode: response.status,
          details: errorData
        };
      }

      const data = await response.json() as OpenAIResponse;

      if (!data.choices?.length) {
        throw {
          type: 'OPENAI_EMPTY_RESPONSE',
          message: 'No response generated from OpenAI',
          statusCode: 500
        };
      }

      const cypherQuery = this.extractCypherQuery(data.choices[0].message.content);

      if (!cypherQuery) {
        throw {
          type: 'OPENAI_INVALID_RESPONSE',
          message: 'Failed to extract valid Cypher query from response',
          statusCode: 500,
          details: { response: data.choices[0].message.content }
        };
      }

      return { cypherQuery };
    } catch (error: any) {
      if (error.type) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw {
          type: 'OPENAI_NETWORK_ERROR',
          message: 'Unable to connect to OpenAI API',
          statusCode: 503
        };
      }

      throw {
        type: 'OPENAI_ERROR',
        message: error.message || 'Unexpected error calling OpenAI API',
        statusCode: 500
      };
    }
  }

  private extractCypherQuery(response: string): string {
    let query = response.trim();

    query = query.replace(/```cypher\n?/gi, '');
    query = query.replace(/```\n?/g, '');

    const cypherKeywords = /^(MATCH|CREATE|MERGE|RETURN|WITH|WHERE|OPTIONAL|CALL|UNWIND)/i;
    const lines = query.split('\n');
    const cypherLines: string[] = [];
    let inQuery = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (cypherKeywords.test(trimmedLine)) {
        inQuery = true;
      }

      if (inQuery && trimmedLine) {
        cypherLines.push(trimmedLine);
      }

      if (inQuery && !trimmedLine && cypherLines.length > 0) {
        break;
      }
    }

    query = cypherLines.join(' ').trim();

    query = query.replace(/\s+LIM$/i, ' LIMIT 50');
    query = query.replace(/\s+LIMI$/i, ' LIMIT 50');

    if (/RETURN\s+[^;]+$/i.test(query) && !/LIMIT\s+\d+/i.test(query)) {
      query += ' LIMIT 50';
    }

    const explanationPattern = /^(.+?)[\s;.]+(?:This|The|Note|Explanation|Here|Above|Query)\s+/i;
    const queryEndMatch = query.match(explanationPattern);
    if (queryEndMatch) {
      query = queryEndMatch[1].trim();
    }

    query = query.replace(/[;.]+$/, '').trim();

    return query;
  }

  private getErrorMessage(status: number, errorData: any): string {
    switch (status) {
      case 401:
        return 'Invalid OpenAI API key';
      case 429:
        return 'OpenAI API rate limit exceeded';
      case 500:
      case 502:
      case 503:
        return 'OpenAI service temporarily unavailable';
      case 400:
        return errorData?.error?.message
          ? `Invalid request: ${errorData.error.message}`
          : 'Invalid request to OpenAI API';
      default:
        return errorData?.error?.message
          ? `OpenAI API error: ${errorData.error.message}`
          : `OpenAI API error (status ${status})`;
    }
  }
}

export const openaiProxyService = new OpenAIProxyService();
