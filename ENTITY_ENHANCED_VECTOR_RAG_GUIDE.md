# 📚 Knowledge Graph Data Addition Guide

This guide shows you how to add data to your Graph RAG knowledge graph using different methods.

## 🚀 **Quick Start: Add Sample Data**

### **Method 1: Using the Workflow (Recommended)**

```bash
# Add comprehensive sample data using the workflow
npm run add-data
```

This will:
- ✅ Process documents into chunks
- ✅ Generate embeddings
- ✅ Store in vector database
- ✅ Test the knowledge graph with sample queries

### **Method 2: Direct Vector Store Operations**

```bash
# Add data directly to vector store
npm run add-data-direct
```

This method:
- ✅ Bypasses the workflow for faster processing
- ✅ Includes entity extraction
- ✅ Tests retrieval immediately

## 📁 **Method 3: File Upload Tool**

### **Upload Individual Files**

```typescript
import { fileUploadTool } from './src/mastra/tools/file-upload-tool.js';

// Upload a markdown file
const result = await fileUploadTool.execute({
  context: {
    filePath: './documents/my-document.md',
    chunkSize: 512,
    overlap: 50,
    contentType: 'markdown'
  },
  mastra: mastra
});

console.log(result.message);
```

### **Supported File Types**

- **📄 Text files** (`.txt`) - Plain text content
- **📝 Markdown files** (`.md`, `.markdown`) - Structured markdown
- **📊 JSON files** (`.json`) - Structured data
- **🔄 Auto-detection** - Automatically detects file type

## 🛠️ **Method 4: Programmatic Addition**

### **Add Text Directly**

```typescript
import { mastra } from './mastra/index.js';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { MDocument } from '@mastra/rag';

async function addTextToKnowledgeGraph(text: string) {
  const vectorStore = mastra.getVector('pgVector');

  // Create document and chunk it
  const doc = MDocument.fromText(text);
  const chunks = await doc.chunk({
    strategy: "recursive",
    size: 512,
    overlap: 50,
  });

  // Generate embeddings
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: chunks.map(chunk => chunk.text),
  });

  // Store in vector database
  await vectorStore.upsert({
    indexName: "embeddings",
    vectors: embeddings,
    metadata: chunks.map(chunk => ({
      text: chunk.text,
      entities: extractEntities(chunk.text),
      source: 'programmatic',
      timestamp: new Date().toISOString()
    })),
  });

  console.log(`✅ Added ${chunks.length} chunks to knowledge graph`);
}
```

### **Add Multiple Documents**

```typescript
async function addMultipleDocuments(documents: string[]) {
  const vectorStore = mastra.getVector('pgVector');
  let totalChunks = 0;

  for (const [index, document] of documents.entries()) {
    console.log(`Processing document ${index + 1}/${documents.length}`);

    const doc = MDocument.fromText(document);
    const chunks = await doc.chunk({
      strategy: "recursive",
      size: 512,
      overlap: 50,
    });

    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks.map(chunk => chunk.text),
    });

    await vectorStore.upsert({
      indexName: "embeddings",
      vectors: embeddings,
      metadata: chunks.map(chunk => ({
        text: chunk.text,
        entities: extractEntities(chunk.text),
        source: `document-${index + 1}`,
        timestamp: new Date().toISOString()
      })),
    });

    totalChunks += chunks.length;
  }

  console.log(`✅ Added ${totalChunks} total chunks to knowledge graph`);
}
```

## 🔧 **Method 5: Batch Processing**

### **Process Multiple Files**

```typescript
import * as fs from 'fs';
import * as path from 'path';

async function processDirectory(directoryPath: string) {
  const files = fs.readdirSync(directoryPath);
  const supportedExtensions = ['.txt', '.md', '.markdown', '.json'];

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const extension = path.extname(file).toLowerCase();

    if (supportedExtensions.includes(extension)) {
      console.log(`Processing: ${file}`);

      const result = await fileUploadTool.execute({
        context: {
          filePath: filePath,
          chunkSize: 512,
          overlap: 50,
          contentType: 'auto'
        },
        mastra: mastra
      });

      console.log(result.message);
    }
  }
}

// Usage
processDirectory('./documents/');
```

## 📊 **Data Quality Tips**

### **1. Chunking Strategy**

```typescript
// For technical documents
const chunks = await doc.chunk({
  strategy: "recursive",
  size: 512,        // Smaller chunks for technical content
  overlap: 50,      // Good overlap for context
});

// For narrative content
const chunks = await doc.chunk({
  strategy: "recursive",
  size: 1024,       // Larger chunks for stories
  overlap: 100,     // More overlap for narrative flow
});
```

### **2. Entity Extraction**

```typescript
// Enhanced entity extraction
function extractEntities(text: string): string[] {
  const entities = new Set<string>();

  // Extract named entities (simple approach)
  const words = text.split(/\s+/);
  const potentialEntities = words.filter(word =>
    word.length > 3 &&
    /^[A-Z][a-z]+/.test(word) &&  // Starts with capital letter
    !commonWords.includes(word.toLowerCase())
  );

  potentialEntities.forEach(entity => entities.add(entity));
  return Array.from(entities);
}
```

### **3. Metadata Enrichment**

```typescript
// Add rich metadata
const metadata = chunks.map(chunk => ({
  text: chunk.text,
  entities: extractEntities(chunk.text),
  source: 'document-name',
  contentType: 'markdown',
  chunkSize: 512,
  overlap: 50,
  timestamp: new Date().toISOString(),
  category: 'technical',  // Add categories
  tags: ['api', 'documentation'],  // Add tags
  author: 'John Doe',  // Add author info
  version: '1.0'  // Add version info
}));
```

## 🧪 **Testing Your Data**

### **Test Knowledge Graph**

```typescript
import { graphRagEnhancedTool } from './src/mastra/tools/graph-rag-enhanced-tool.js';

async function testKnowledgeGraph() {
  const testQueries = [
    "What is the main topic?",
    "Tell me about the key features",
    "What are the important statistics?",
    "How does the system work?"
  ];

  for (const query of testQueries) {
    console.log(`\nQuery: "${query}"`);
    console.log('─'.repeat(60));

    const result = await graphRagEnhancedTool.execute({
      context: {
        query,
        topK: 5,
        graphDepth: 2,
        useGraphTraversal: true
      },
      mastra: mastra
    });

    console.log(`Response: ${result.relevantContext.substring(0, 200)}...`);
    console.log(`Sources: ${result.sources.length}`);
    console.log(`Entities: ${result.entities.length}`);
    console.log(`Graph nodes: ${result.graphPath.length}`);
  }
}
```

## 📈 **Monitoring and Maintenance**

### **Check Knowledge Graph Status**

```typescript
async function checkKnowledgeGraphStatus() {
  const vectorStore = mastra.getVector('pgVector');

  try {
    const stats = await vectorStore.describeIndex({
      indexName: "embeddings"
    });

    console.log('Knowledge Graph Status:');
    console.log(`- Total vectors: ${stats.count}`);
    console.log(`- Dimension: ${stats.dimension}`);
    console.log(`- Metric: ${stats.metric}`);

  } catch (error) {
    console.log('Knowledge graph is empty or not initialized');
  }
}
```

### **Clean Up Old Data**

```typescript
async function cleanupOldData(daysOld: number = 30) {
  const vectorStore = mastra.getVector('pgVector');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Query for old data
  const oldData = await vectorStore.query({
    indexName: "embeddings",
    queryVector: new Array(1536).fill(0), // Dummy vector
    topK: 1000,
    filter: {
      timestamp: { $lt: cutoffDate.toISOString() }
    }
  });

  // Delete old data
  for (const item of oldData) {
    await vectorStore.deleteVector({
      indexName: "embeddings",
      id: item.id
    });
  }

  console.log(`Deleted ${oldData.length} old entries`);
}
```

## 🎯 **Best Practices**

1. **📏 Consistent Chunking**: Use the same chunk size and overlap for related documents
2. **🏷️ Rich Metadata**: Include source, timestamp, categories, and tags
3. **🔍 Entity Extraction**: Extract and store entities for better graph traversal
4. **📊 Regular Testing**: Test queries after adding new data
5. **🧹 Maintenance**: Regularly clean up old or outdated data
6. **📈 Monitoring**: Track the size and performance of your knowledge graph

## 🚀 **Next Steps**

After adding data to your knowledge graph:

1. **Test queries** to ensure data is properly indexed
2. **Use Graph RAG** for enhanced retrieval with entity relationships
3. **Monitor performance** and adjust chunking parameters as needed
4. **Add more data** incrementally to build a comprehensive knowledge base

Your Graph RAG system is now ready to provide intelligent, context-aware responses based on your knowledge graph!
