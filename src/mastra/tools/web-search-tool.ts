import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const webSearchTool = createTool({
  id: 'web-search',
  description: 'Search the web for current information when local knowledge base is insufficient',
  inputSchema: z.object({
    query: z.string().describe('The search query to find information on the web'),
    maxResults: z.number().default(5).describe('Maximum number of search results to return'),
    mcp: z.any().optional().describe('MCP client for web search'),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
      content: z.string().optional(),
    })),
    searchQuery: z.string(),
    totalResults: z.number(),
  }),
  execute: async ({ context }) => {
    const { query, maxResults = 5, mcp } = context;

    try {
      if (!mcp) {
        throw new Error('MCP client not available');
      }

      // Get web search tools from MCP server
      const tools = await mcp.getTools();
      const webSearchTools = Object.values(tools).filter((tool: any) =>
        tool.id?.includes('search') || tool.id?.includes('web')
      );

      if (webSearchTools.length === 0) {
        throw new Error('No web search tools available in MCP servers');
      }

      // Use the first available web search tool
      const searchTool = webSearchTools[0] as any;

      // Execute web search
      const searchResult = await searchTool.execute({
        query,
        maxResults,
      });

      // Process and format results
      const results = Array.isArray(searchResult.results)
        ? searchResult.results.slice(0, maxResults)
        : [];

      return {
        results: results.map((result: any) => ({
          title: result.title || result.name || 'No title',
          url: result.url || result.link || '#',
          snippet: result.snippet || result.description || result.content || 'No description',
          content: result.content || result.text,
        })),
        searchQuery: query,
        totalResults: results.length,
      };

    } catch (error) {
      console.error('Web search failed:', error);
      return {
        results: [],
        searchQuery: query,
        totalResults: 0,
      };
    }
  },
});
