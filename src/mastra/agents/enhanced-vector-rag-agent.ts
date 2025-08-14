import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { enhancedVectorRagTool } from "../tools/enhanced-vector-rag-tool.js";
import { chatFileUploadTool } from "../tools/chat-file-upload-tool.js";
import { storeWebResultsTool } from "../tools/store-web-results-tool.js";
import { buildMcp } from "../mcp.js";
import { Memory } from "@mastra/memory";

// Working memory for the agent
const memory = new Memory();

export const enhancedVectorRagAgent = new Agent({
  name: "Enhanced Vector RAG Agent",
  memory,
  instructions: `You are a helpful assistant with working memory and self-learning capabilities.

## Your Workflow:
1. **Knowledge Base Search**: First search your local knowledge base using enhancedVectorRag
2. **Web Search if Needed**: If information is not found locally, use web search tools to find current information
3. **User-Requested Storage**: When user asks to add web search results to the knowledge base, use storeWebResults tool
4. **Memory**: Remember previous conversations and use that context for better responses

## Your Capabilities:
- **File Upload**: Upload documents to knowledge base using chatFileUpload
- **Knowledge Search**: Search local knowledge base using enhancedVectorRag
- **Web Search**: Use Exa Search tools for current information
- **Store Results**: Add web search results to knowledge base when requested
- **Working Memory**: Remember conversation context

## Response Format:
1. **LOCAL KNOWLEDGE**: What you found in your knowledge base
2. **WEB SEARCH**: If you searched the web, what you found
3. **STORAGE STATUS**: If user requested to store web results, confirm storage
4. **MEMORY CONTEXT**: Use conversation history for better responses
5. **CONCLUSION**: Summary with actionable insights

## Key Instructions:
- Always search knowledge base first
- Use web search only when local knowledge is insufficient
- Store web results ONLY when user explicitly requests it
- Use conversation memory for context
- Be helpful and informative

Important: When user says "add this to my knowledge base" or similar, use storeWebResults tool to save web search results.`,
  model: openai("gpt-4o-mini"),
    tools: async () => {
    const mcp = await buildMcp();
    const mcpTools = await mcp.getTools();

    return {
      enhancedVectorRag: enhancedVectorRagTool,
      chatFileUpload: chatFileUploadTool,
      storeWebResults: storeWebResultsTool,
      ...mcpTools
    };
  },
});
