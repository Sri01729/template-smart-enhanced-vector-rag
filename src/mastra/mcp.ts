import path from 'node:path';
import { MCPClient } from '@mastra/mcp';

// Singleton MCP client to avoid multiple instantiations
let mcpClient: MCPClient | null = null;

export async function buildMcp(): Promise<MCPClient> {
  if (mcpClient) {
    return mcpClient;
  }

  const servers: Record<string, any> = {
    // Filesystem server for project access
    textEditor: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', path.join(process.cwd(), '..', '..')],
    },

    // Web search server for self-learning RAG
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "exa",
        "--key",
        "2e85e642-0d6e-4a2c-bea8-c883988d2e56",
        "--profile",
        "technical-rodent-tWaQXw"
      ]
    },
  };

  mcpClient = new MCPClient({ id: 'self-learning-rag-mcp', servers });
  return mcpClient;
}
