# Template Smart Enhanced Vector RAG

A comprehensive **Entity-Enhanced Vector RAG** system built with Mastra, featuring multi-stage retrieval, entity-aware processing, self-learning capabilities, and working memory.

## 🚀 Features

- **Entity-Enhanced RAG**: Advanced retrieval using entity extraction, multi-stage search, and relationship discovery
- **Multi-Stage Retrieval**: Vector similarity + entity-based enhancement
- **Entity Recognition**: Automatic extraction of entities from queries and documents
- **Dynamic Relationship Discovery**: Finds related content through entity connections using vector similarity
- **Entity-Aware Retrieval**: Context expansion beyond direct similarity
- **Entity-Based Reranking**: Enhanced result relevance through entity overlap scoring
- **Self-Learning RAG**: Automatically searches the web when local knowledge is insufficient and stores new information
- **Working Memory**: Agent remembers conversation context for personalized responses
- **User-Controlled Storage**: Store web search results in knowledge base when explicitly requested
- **Document Processing**: Support for text, markdown, HTML, and JSON documents
- **Intelligent Chunking**: Recursive chunking strategies with overlap
- **Vector Storage**: PostgreSQL with pgvector for efficient similarity search
- **Agent-based Queries**: Intelligent agents with structured response formatting
- **MCP Integration**: Model Context Protocol for web search and external tools

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL with pgvector extension
- OpenAI API key
- Smithery API key (for web search)

## 🎯 What Makes This System Special

Unlike basic RAG systems that only use vector similarity, this implementation provides:

- **Entity Extraction**: Automatically identifies key entities in queries and documents
- **Multi-Stage Retrieval**: Combines vector similarity with entity-based searches
- **Dynamic Relationship Discovery**: Maps connections between different pieces of content through semantic similarity
- **Enhanced Reranking**: Uses entity overlap to improve result relevance
- **Context Expansion**: Expands search beyond direct similarity using entity relationships
- **Self-Learning Capability**: Automatically searches the web when local knowledge is insufficient and stores new information for future queries
- **Working Memory**: Agent remembers conversation context for personalized responses
- **User-Controlled Storage**: Only stores web results when explicitly requested by the user
- **MCP Integration**: Uses Model Context Protocol for seamless web search integration

## 🧠 Memory Features

**Working Memory**: The agent now includes working memory for enhanced conversation context:

- **Conversation History**: Agent remembers previous interactions
- **Context Awareness**: Better responses based on conversation flow
- **Persistent Memory**: Information persists across sessions
- **Contextual Responses**: Agent can reference previous topics

The system combines:
- **Entity-enhanced retrieval** from the knowledge base
- **Multi-stage search** combining vector similarity and entity relationships
- **Dynamic relationship discovery** through semantic similarity
- **Self-learning** by automatically searching the web when local knowledge is insufficient
- **User-controlled storage** of web search results
- **Working memory** for conversation context

## 🛠️ Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env file
   OPENAI_API_KEY=your_openai_api_key_here
   POSTGRES_CONNECTION_STRING=postgresql://username:password@localhost:5432/mastra_rag
   SMITHERY_API_KEY=your_smithery_api_key_here
   ```

3. **Set up PostgreSQL with pgvector:**
   ```bash
   # Install pgvector extension
   CREATE EXTENSION IF NOT EXISTS vector;

   # Create database (if not exists)
   CREATE DATABASE mastra_rag;
   ```

## 🏗️ Architecture

### Components

1. **Entity-Enhanced RAG Agent** (`src/mastra/agents/enhanced-vector-rag-agent.ts`)
   - Intelligent agent with working memory
   - Structured response formatting
   - Multi-stage context retrieval
   - Dynamic tool loading from MCP servers

2. **Document Processing Workflow** (`src/mastra/workflows/enhanced-vector-rag-workflow.ts`)
   - Document processing pipeline
   - Embedding generation
   - Vector storage management
   - Query execution

3. **Document Tool** (`src/mastra/tools/document-tool.ts`)
   - Multi-format document processing
   - Configurable chunking strategies
   - Metadata extraction

4. **Enhanced Vector RAG Tool** (`src/mastra/tools/enhanced-vector-rag-tool.ts`)
   - Multi-stage retrieval (vector similarity + entity search)
   - Entity extraction and relationship discovery
   - Result deduplication and filtering
   - Entity-based reranking
   - Self-learning web search integration

5. **File Upload Tools** (`src/mastra/tools/chat-file-upload-tool.ts`, `src/mastra/tools/file-upload-tool.ts`)
   - Chat-based file upload interface
   - Multi-format document support
   - Automatic processing and storage

6. **Web Search Tools** (`src/mastra/tools/store-web-results-tool.ts`)
   - User-controlled storage of web search results in vector database
   - Only stores results when explicitly requested by user
   - Self-learning knowledge base expansion

7. **MCP Configuration** (`src/mastra/mcp.ts`)
   - Model Context Protocol server configuration
   - Exa Search server integration for web search
   - Filesystem server for project access
   - Dynamic tool discovery and management

8. **Mastra Configuration** (`src/mastra/index.ts`)
   - Core system configuration
   - Vector store integration (PgVector)
   - Agent and workflow registration
   - Memory configuration
   - PostgreSQL storage

## 🎯 Usage

### Self-Learning RAG Workflow

The system includes a **self-learning workflow** with user-controlled storage:

1. **Primary Search**: Query the local vector database for relevant information
2. **Web Search Fallback**: If insufficient information is found, automatically search the web
3. **User-Requested Storage**: Store web search results only when user explicitly requests it
4. **Working Memory**: Use conversation context for better responses
5. **Combined Response**: Provide answers using both local and newly acquired information

### Basic Usage

```typescript
import { mastra } from './src/mastra/index.js';

// Get the Entity-Enhanced RAG agent
const agent = mastra.getAgent('enhancedVectorRagAgent');

// Query the knowledge base (with automatic web search if needed)
const response = await agent.generate("What are the latest developments in quantum computing?");
console.log(response.text);
```

### Document Processing

```typescript
import { mastra } from './src/mastra/index.js';

// Get the document processing tool
const documentTool = mastra.getTool('documentTool');

// Process a document
const result = await documentTool.execute({
  content: "# My Document\n\nThis is the content...",
  contentType: "markdown",
  chunkSize: 512,
  overlap: 50,
  strategy: "recursive"
});

console.log(`Created ${result.chunks.length} chunks`);
```

### File Upload

```typescript
import { mastra } from './src/mastra/index.js';

// Get the chat file upload tool
const chatFileUploadTool = mastra.getTool('chatFileUpload');

// Upload a document via chat interface
const result = await chatFileUploadTool.execute({
  file: fileBuffer,
  filename: "document.pdf",
  contentType: "application/pdf"
});

console.log(`Uploaded and processed ${result.chunks.length} chunks`);
```

### Workflow Usage

```typescript
import { mastra } from './src/mastra/index.js';

// Get the document processing workflow
const workflow = mastra.getWorkflow('enhancedVectorRagWorkflow');

// Process documents through the entire pipeline
const { chunks } = await workflow.execute('processDocuments', {
  documents: ["Document 1 content...", "Document 2 content..."],
  chunkSize: 512,
  overlap: 50
});

// Generate embeddings
const { embeddings } = await workflow.execute('generateEmbeddings', { chunks });

// Store in vector database
const { success } = await workflow.execute('storeEmbeddings', {
  embeddings,
  chunks,
  vectorStore: mastra.getVector('pgVector')
});

// Query the knowledge base
const { response } = await workflow.execute('queryEnhancedVectorRag', {
  query: "Your question here",
  agent: mastra.getAgent('enhancedVectorRagAgent')
});
```

### Web Search and Storage

```typescript
import { mastra } from './src/mastra/index.js';

// Get the store web results tool
const storeWebResultsTool = mastra.getTool('storeWebResults');

// Store web search results when user requests it
const result = await storeWebResultsTool.execute({
  searchResults: webSearchResults,
  originalQuery: "quantum computing developments",
  userRequested: true
});

console.log(`Stored ${result.storedCount} web search results`);
```

### Running the Example

```bash
# Run the complete example
npm run dev

# Or run the example directly
npx tsx examples/add-data-direct.ts
```

## 🔧 Configuration

### Enhanced Vector RAG Tool Configuration

```typescript
const enhancedRagTool = createTool({
  id: "enhancedVectorRag",
  description: "Query the knowledge base using multi-stage retrieval with entity relationships",
  inputSchema: z.object({
    query: z.string(),
    topK: z.number().default(10),
    entityDepth: z.number().default(2),
    useEntityEnhancement: z.boolean().default(true),
  }),
  // ... tool implementation
});
```

### Agent Configuration

```typescript
const enhancedRagAgent = new Agent({
  name: "Enhanced Vector RAG Agent",
  memory, // Working memory for conversation context
  instructions: `You are a helpful assistant with working memory and self-learning capabilities.

  ## Your Workflow:
  1. **Knowledge Base Search**: First search your local knowledge base using enhancedVectorRag
  2. **Web Search if Needed**: If information is not found locally, use web search tools to find current information
  3. **User-Requested Storage**: When user asks to add web search results to the knowledge base, use storeWebResults tool
  4. **Memory**: Remember previous conversations and use that context for better responses`,
  model: openai("gpt-4o-mini"),
  tools: async () => {
    const mcp = await buildMcp();
    const mcpTools = await mcp.getTools();

    return {
      enhancedVectorRag: enhancedVectorRagTool,
      chatFileUpload: chatFileUploadTool,
      storeWebResults: storeWebResultsTool,
      ...mcpTools // Dynamic MCP tools (Exa Search, etc.)
    };
  },
});
```

## 📊 Response Format

The Entity-Enhanced RAG agent provides structured responses:

```
1. LOCAL KNOWLEDGE:
   - Information found in your knowledge base
   - Relevant facts and data from stored documents

2. WEB SEARCH:
   - Current information found through web search (if applicable)
   - Latest developments and updates

3. STORAGE STATUS:
   - Confirmation if web results were stored (when requested)
   - Number of items added to knowledge base

4. MEMORY CONTEXT:
   - References to previous conversation topics
   - Contextual insights based on conversation history

5. CONCLUSION:
   Summary with actionable insights and recommendations.
```

## 🧪 Testing

The system includes comprehensive examples with sample documents about AI technology and world models. The example demonstrates:

- Document processing and chunking
- Embedding generation
- Vector storage
- Multi-stage retrieval (vector similarity + entity search)
- Entity-based relationship discovery

## 🔍 Advanced Features

### Available MCP Tools

The agent dynamically loads tools from MCP servers:

- **Exa Search Tools**:
  - `web_search_exa`: General web search
  - `company_research_exa`: Company research
  - `crawling_exa`: URL crawling
  - `linkedin_search_exa`: LinkedIn search
  - `deep_researcher_start`: Deep research tasks
  - `deep_researcher_check`: Check research status

- **Filesystem Tools**:
  - File access and manipulation tools

### Custom Document Types

Support for multiple document formats:
- **Text**: Plain text documents
- **Markdown**: Structured markdown with headers and formatting
- **HTML**: Web content with semantic structure
- **JSON**: Structured data with nested objects

### Chunking Strategies

- **Recursive**: Intelligent chunking that respects document structure
- **Fixed**: Uniform chunk sizes with configurable overlap

### Entity Enhancement Options

- **TopK**: Number of initial vector similarity results (default: 10)
- **EntityDepth**: Depth of entity-based search (default: 2)
- **UseEntityEnhancement**: Enable entity-based enhancement (default: true)
- **MaxResults**: Maximum number of results to return (default: 15)
- **ContextLength**: Maximum context length in characters (default: 6000)

## 🚀 Development

### Project Structure

```
src/
├── mastra/
│   ├── agents/
│   │   └── enhanced-vector-rag-agent.ts
│   ├── workflows/
│   │   └── enhanced-vector-rag-workflow.ts
│   ├── tools/
│   │   ├── document-tool.ts
│   │   ├── enhanced-vector-rag-tool.ts
│   │   ├── chat-file-upload-tool.ts
│   │   ├── file-upload-tool.ts
│   │   ├── store-web-results-tool.ts
│   │   └── web-search-tool.ts
│   ├── mcp.ts
│   └── index.ts
├── examples/
│   └── add-data-direct.ts
└── index.ts
```

### Adding New Features

1. **New Agent**: Create in `src/mastra/agents/` and register in `src/mastra/index.ts`
2. **New Workflow**: Create in `src/mastra/workflows/` and register in `src/mastra/index.ts`
3. **New Tool**: Create in `src/mastra/tools/` and register in the agent's tools configuration
4. **New MCP Server**: Add to `src/mastra/mcp.ts` for external tool integration

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📚 Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Vector RAG Research](https://arxiv.org/abs/2308.15011)

## 🤔 What This System Actually Is

This system is **NOT** a traditional Graph RAG system with a graph database like Neo4j. Instead, it's an **Entity-Enhanced Vector RAG** system that:

- Uses **vector similarity** as the primary retrieval method
- **Extracts entities** from queries and documents dynamically
- **Simulates graph traversal** using entity-based vector searches
- **Discovers relationships** through semantic similarity
- **Reranks results** based on entity overlap

Think of it as **"Graph RAG without the graph database"** - you get the benefits of finding related content through entity relationships, but using vector similarity instead of explicit graph traversal.

## 🔍 How Entity Enhancement Works

### **Multi-Stage Retrieval Process:**

1. **Initial Vector Search**:
   - Query is converted to embeddings
   - Vector similarity search finds initial results
   - Uses OpenAI's `text-embedding-3-small` model

2. **Entity Extraction**:
   - Extracts key entities from the query (words > 3 characters)
   - Filters out common words (the, and, or, but, etc.)
   - Identifies meaningful concepts and topics

3. **Entity-Based Search**:
   - Each entity becomes a separate search query
   - Finds documents related to each entity
   - Expands search beyond direct query similarity
   - Limits to top 3 entities for performance

4. **Result Enhancement**:
   - Combines initial results with entity-based results
   - Removes duplicates
   - Maintains quality with score thresholds (> 0.7)

5. **Entity-Based Reranking**:
   - Counts entity occurrences in each result
   - Boosts scores based on entity overlap
   - Sorts results by enhanced scores
   - Provides more relevant ordering

### **Example Workflow:**

**Query**: "What are the latest developments in quantum computing?"

1. **Initial Search**: Finds documents about "quantum computing"
2. **Entity Extraction**: Identifies entities ["quantum", "computing", "developments"]
3. **Entity Search**:
   - Searches for "quantum" → finds quantum physics documents
   - Searches for "computing" → finds computer science documents
   - Searches for "developments" → finds recent research documents
4. **Enhancement**: Combines all results, removes duplicates
5. **Reranking**: Boosts documents that mention multiple entities
6. **Final Result**: More comprehensive, contextually relevant information

### **Benefits:**

- **Broader Context**: Finds related information beyond direct query matches
- **Better Relevance**: Entity overlap indicates stronger relationships
- **Dynamic Discovery**: No predefined graph structure needed
- **Scalable**: Works with any document collection
- **Semantic Understanding**: Uses embeddings for semantic similarity

This approach gives you the benefits of graph-based relationships without the complexity of maintaining a graph database!
