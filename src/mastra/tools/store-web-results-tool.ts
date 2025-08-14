import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { MDocument } from '@mastra/rag';

export const storeWebResultsTool = createTool({
  id: 'store-web-results',
  description: 'Store web search results in the knowledge base when user requests to add them',
  inputSchema: z.object({
    searchResults: z.array(z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
      content: z.string().optional(),
    })).describe('Web search results to store'),
    originalQuery: z.string().describe('The original query that led to these results'),
    userRequested: z.boolean().default(true).describe('Whether the user explicitly requested to store these results'),
  }),
  outputSchema: z.object({
    message: z.string().describe('Confirmation message about stored results'),
    storedCount: z.number().describe('Number of results stored'),
    documentIds: z.array(z.string()).describe('IDs of stored documents'),
  }),
  execute: async ({ context, mastra }) => {
    const { searchResults, originalQuery, userRequested } = context;

    try {
      if (!userRequested) {
        return {
          message: 'Web search results not stored - user did not request storage',
          storedCount: 0,
          documentIds: [],
        };
      }

      const vectorStore = mastra?.getVector("pgVector");
      if (!vectorStore) {
        throw new Error('Vector store not available');
      }

      // Convert web search results to documents
      const documents = searchResults.map((result, index) => ({
        id: `web_${Date.now()}_${index}`,
        text: result.content || result.snippet || '',
        metadata: {
          title: result.title || 'Web Search Result',
          url: result.url || '#',
          source: 'web_search',
          originalQuery: originalQuery,
          timestamp: new Date().toISOString(),
          userRequested: true,
        },
      }));

      // Generate embeddings
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: documents.map(doc => doc.text),
      });

      // Store in vector database
      await vectorStore.upsert({
        indexName: "embeddings",
        vectors: embeddings,
        metadata: documents.map((doc, i) => ({
          text: doc.text,
          ...doc.metadata,
        })),
      });

      return {
        message: `✅ Successfully stored ${documents.length} web search results in knowledge base`,
        storedCount: documents.length,
        documentIds: documents.map(doc => doc.id),
      };

    } catch (error) {
      console.error('Failed to store web search results:', error);
      return {
        message: `❌ Failed to store web search results: ${error instanceof Error ? error.message : String(error)}`,
        storedCount: 0,
        documentIds: [],
      };
    }
  },
});
