import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildMcp } from "../mcp.js";
import { MDocument } from "@mastra/rag";

// Enhanced Vector RAG with entity-based retrieval
export const enhancedVectorRagTool = createTool({
  id: "enhancedVectorRag",
  description: "Query the knowledge base using multi-stage retrieval with entity relationships and entity-based enhancement",
  inputSchema: z.object({
    query: z.string().describe("The question or query to search for in the knowledge base"),
    topK: z.number().default(10).describe("Number of top results to retrieve"),
    entityDepth: z.number().default(2).describe("Depth of entity-based search"),
    useEntityEnhancement: z.boolean().default(true).describe("Whether to use entity-based enhancement for retrieval"),
  }),
  outputSchema: z.object({
    relevantContext: z.string().describe("Combined text from the most relevant document chunks"),
    sources: z.array(z.any()).describe("Array of source documents with metadata and scores"),
    entityPath: z.array(z.any()).describe("Entity-based search path showing relationships"),
    entities: z.array(z.string()).describe("Entities found in the query and results"),
    webSearchUsed: z.boolean().describe("Whether web search was used to supplement local knowledge"),
    webSearchResults: z.array(z.any()).optional().describe("Web search results that were stored"),
  }),
  execute: async ({ context, mastra }: any) => {
    const { query, topK = 10, entityDepth = 2, useEntityEnhancement = true } = context;

    try {
      // Get the vector store
      const vectorStore = mastra?.getVector("pgVector");
      if (!vectorStore) {
        throw new Error("Vector store not found. Please ensure pgVector is configured.");
      }

      // Generate embedding for the query
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: [query],
      });

      const queryEmbedding = embeddings[0];

      // Step 1: Initial vector similarity search
      let initialResults = await vectorStore.query({
        indexName: "embeddings",
        queryVector: queryEmbedding,
        topK: topK,
        includeVector: false,
      });

      let webSearchUsed = false;
      let webSearchResults: any[] = [];

      // Check if we have sufficient local results
      const hasSufficientLocalResults = initialResults && initialResults.length > 0 &&
        initialResults.some((result: any) => (result.score || 0) > 0.7);

            if (!hasSufficientLocalResults) {
        console.log(`🔍 Insufficient local results for query: "${query}". Initiating web search...`);

        try {
          // Perform web search using Exa Search MCP server via stdio
          const mcp = await buildMcp();
          const tools = await mcp.getTools();

          // Log available tools to see correct IDs
          console.log('Available MCP tools:', Object.keys(tools).map(key => ({
            key,
            id: tools[key]?.id,
            description: tools[key]?.description
          })));

          // Use Exa Search's web search tool directly
          const exaWebSearchTool = Object.values(tools).find((tool: any) =>
            tool.id?.includes('search') || tool.id?.includes('web')
          );

          if (!exaWebSearchTool) {
            console.log('Available tool IDs:', Object.values(tools).map((tool: any) => tool.id));
            throw new Error('Exa Search web search tool not available');
          }

          const searchResult = await exaWebSearchTool.execute({
            query,
            numResults: 5
          });

          if (searchResult.results && searchResult.results.length > 0) {
            webSearchUsed = true;
            webSearchResults = searchResult.results;

            // Store web search results in vector database
            const documents: MDocument[] = searchResult.results.map((result: any) => ({
              id: `web_${Date.now()}_${Math.random()}`,
              content: result.content || result.snippet || result.description || '',
              metadata: {
                title: result.title || result.name || 'Web Search Result',
                url: result.url || result.link || '#',
                source: 'web_search',
                originalQuery: query,
                timestamp: new Date().toISOString(),
              },
            }));

            // Generate embeddings for web search results
            const { embeddings } = await embedMany({
              model: openai.embedding("text-embedding-3-small"),
              values: documents.map(doc => (doc as any).content || ''),
            });

            // Store in vector database
            await vectorStore.upsert({
              indexName: "embeddings",
              documents: documents.map((doc, i) => ({
                ...doc,
                vector: embeddings[i],
              })),
            });

            console.log(`💾 Stored ${documents.length} web search results in vector database`);

            // Re-query the vector store to include newly stored content
            const updatedResults = await vectorStore.query({
              indexName: "embeddings",
              queryVector: queryEmbedding,
              topK: topK + 5, // Get more results to include new content
              includeVector: false,
            });

            if (updatedResults && updatedResults.length > 0) {
              initialResults = updatedResults;
              console.log(`✅ Found ${updatedResults.length} results after web search enhancement`);
            }
          }
        } catch (webSearchError) {
          console.warn('Web search failed, continuing with local results:', webSearchError);
        }
      }

      if (!initialResults || initialResults.length === 0) {
        return {
          relevantContext: `No relevant information found for the query: "${query}". The knowledge base may be empty or the query doesn't match any stored documents.`,
          sources: [],
          entityPath: [],
          entities: [],
          webSearchUsed,
          webSearchResults: webSearchUsed ? webSearchResults : undefined
        };
      }

      // Step 2: Extract entities from query and results
      const entities = await extractEntities(query, initialResults);

      // Step 3: Entity-based enhancement (if enabled and data available)
      let enhancedResults = initialResults;
      let entityPath: any[] = [];

      if (useEntityEnhancement && entities.length > 0) {
        const entityResults = await performEntitySearch(
          entities,
          initialResults,
          entityDepth,
          vectorStore
        );

        if (entityResults.length > 0) {
          enhancedResults = [...initialResults, ...entityResults];
          entityPath = entityResults.map((result: any) => ({
            nodeId: result.id,
            relationship: "entity_search",
            score: result.score,
            text: result.metadata?.text?.substring(0, 100) + "..."
          }));
        }
      }

            // Step 4: Rerank results based on entity overlap
      const rerankedResults = await rerankByEntityOverlap(enhancedResults, entities);

      // Step 5: Deduplicate and filter results
      const seenIds = new Set<string>();
      const uniqueResults = rerankedResults.filter((result: any) => {
        if (seenIds.has(result.id)) return false;
        seenIds.add(result.id);
        return true;
      });

      // Step 6: Extract and combine relevant text (with better filtering)
      const maxContextLength = 6000; // Reduced for more focused responses
      let relevantTexts = "";
      let currentLength = 0;
      let addedCount = 0;
      const maxResults = 15; // Limit number of results

      for (const result of uniqueResults) {
        if (addedCount >= maxResults) break;

        if (result.metadata && result.metadata.text) {
          const text = result.metadata.text;

          // Skip very short or irrelevant content
          if (text.length < 50) continue;

          // Skip content that doesn't contain query-related entities
          const textLower = text.toLowerCase();
          const hasRelevantContent = entities.some(entity =>
            textLower.includes(entity.toLowerCase())
          );
          if (!hasRelevantContent) continue;

          if (currentLength + text.length > maxContextLength) {
            const remainingSpace = maxContextLength - currentLength;
            if (remainingSpace > 200) { // Only add if we have meaningful space
              relevantTexts += "\n\n" + text.substring(0, remainingSpace - 200) + "...";
            }
            break;
          }
          relevantTexts += (relevantTexts ? "\n\n" : "") + text;
          currentLength += text.length;
          addedCount++;
        }
      }

      // Step 6: Format sources for response
      const sources = rerankedResults.map((result: any, index: number) => ({
        id: `result-${index}`,
        score: result.score || 0,
        document: result.metadata?.text || "No text available",
        metadata: {
          ...result.metadata,
          score: result.score,
          id: result.id,
          retrievalMethod: index < initialResults.length ? "vector_similarity" : "entity_search"
        }
      }));

      return {
        relevantContext: relevantTexts || `No text content found for query: "${query}"`,
        sources: sources,
        entityPath: entityPath,
        entities: entities,
        webSearchUsed,
        webSearchResults: webSearchUsed ? webSearchResults : undefined
      };

    } catch (error) {
      console.error("Error in Enhanced Vector RAG query:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        relevantContext: `Error retrieving information for query: "${query}". Please check if the vector store is properly configured and contains data.`,
        sources: [{
          id: "error",
          score: 0,
          document: "Error occurred during retrieval",
          metadata: { error: errorMessage }
        }],
        entityPath: [],
        entities: [],
        webSearchUsed: false,
        webSearchResults: undefined
      };
    }
  },
});

// Extract entities from text using simple NLP techniques
async function extractEntities(query: string, results: any[]): Promise<string[]> {
  const entities = new Set<string>();

  // Extract potential entities from query (simple approach)
  const queryWords = query.toLowerCase().split(/\s+/);
  const potentialEntities = queryWords.filter(word =>
    word.length > 3 && /^[a-zA-Z]+$/.test(word)
  );

  potentialEntities.forEach(entity => entities.add(entity));

  // Extract entities from results (if metadata contains entity information)
  results.forEach((result: any) => {
    if (result.metadata?.entities) {
      result.metadata.entities.forEach((entity: string) => entities.add(entity));
    }
  });

  return Array.from(entities);
}

// Perform entity-based search to find related nodes
async function performEntitySearch(
  entities: string[],
  initialResults: any[],
  depth: number,
  vectorStore: any
): Promise<any[]> {
  const relatedResults: any[] = [];

  try {
    // Focus on the most relevant entities (limit to top 3)
    const topEntities = entities.slice(0, 3);

    for (const entity of topEntities) {
      // Skip very common words that don't add value
      const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      if (commonWords.includes(entity.toLowerCase())) continue;

      const entityEmbedding = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: [entity],
      });

      const entityResults = await vectorStore.query({
        indexName: "embeddings",
        queryVector: entityEmbedding.embeddings[0],
        topK: Math.min(5, depth * 2), // Limit results per entity
        includeVector: false,
      });

      // Add results that aren't already in initial results and have good scores
      entityResults.forEach((result: any) => {
        if (!initialResults.find((initial: any) => initial.id === result.id) &&
            result.score > 0.7) { // Only add high-quality matches
          relatedResults.push({
            ...result,
            score: result.score * 0.7, // Lower score for entity search results
            metadata: {
              ...result.metadata,
              entitySearch: true,
              entity: entity
            }
          });
        }
      });
    }
  } catch (error) {
    console.warn("Entity search failed, falling back to vector search:", error);
  }

  return relatedResults;
}

// Rerank results based on entity overlap
async function rerankByEntityOverlap(results: any[], entities: string[]): Promise<any[]> {
  if (entities.length === 0) return results;

  return results.map((result: any) => {
    let entityScore = 0;
    const text = result.metadata?.text?.toLowerCase() || "";

    // Count entity occurrences
    entities.forEach(entity => {
      const regex = new RegExp(`\\b${entity}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        entityScore += matches.length;
      }
    });

    // Boost score based on entity overlap
    const boostedScore = result.score + (entityScore * 0.1);

    return {
      ...result,
      score: boostedScore,
      metadata: {
        ...result.metadata,
        entityScore,
        boostedScore
      }
    };
  }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
}
