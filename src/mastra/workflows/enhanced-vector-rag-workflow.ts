import { createWorkflow, createStep } from "@mastra/core/workflows";
import { openai } from "@ai-sdk/openai";
import { PgVector } from "@mastra/pg";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";

import { z } from "zod";

// Define schemas for the workflow steps
const processDocumentsSchema = z.object({
  documents: z.array(z.string()),
  chunkSize: z.number().default(512),
  overlap: z.number().default(50),
});

const chunksSchema = z.object({
  chunks: z.array(z.object({
    text: z.string(),
    metadata: z.record(z.any()).optional(),
  })),
});

const embeddingsSchema = z.object({
  embeddings: z.array(z.array(z.number())),
});

const storeEmbeddingsSchema = z.object({
  embeddings: z.array(z.array(z.number())),
  chunks: z.array(z.object({
    text: z.string(),
    metadata: z.record(z.any()).optional(),
  })),
  vectorStore: z.any(), // PgVector instance
});

const successSchema = z.object({
  success: z.boolean(),
});

const querySchema = z.object({
  query: z.string(),
  agent: z.any(), // Agent instance
});

const responseSchema = z.object({
  response: z.string(),
});

// Create workflow steps
const processDocumentsStep = createStep({
  id: "processDocuments",
  description: "Process documents into chunks for embedding",
  inputSchema: processDocumentsSchema,
  outputSchema: chunksSchema,
  execute: async (context) => {
    const { documents, chunkSize = 512, overlap = 50 } = context.inputData;
    const allChunks = [];

    for (const docText of documents) {
      const doc = MDocument.fromText(docText);
      const chunks = await doc.chunk({
        strategy: "recursive",
        size: chunkSize,
        overlap: overlap,
        separator: "\n",
      });
      allChunks.push(...chunks);
    }

    return { chunks: allChunks };
  },
});

const generateEmbeddingsStep = createStep({
  id: "generateEmbeddings",
  description: "Generate embeddings for document chunks",
  inputSchema: chunksSchema,
  outputSchema: embeddingsSchema,
  execute: async (context) => {
    const { chunks } = context.inputData;
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks.map((chunk: any) => chunk.text),
    });

    return { embeddings };
  },
});

const storeEmbeddingsStep = createStep({
  id: "storeEmbeddings",
  description: "Store embeddings in PgVector database",
  inputSchema: storeEmbeddingsSchema,
  outputSchema: successSchema,
  execute: async (context) => {
    const { embeddings, chunks, vectorStore } = context.inputData;
    try {
      await vectorStore.createIndex({
        indexName: "embeddings",
        dimension: 1536,
      });

      await vectorStore.upsert({
        indexName: "embeddings",
        vectors: embeddings,
        metadata: chunks?.map((chunk: any) => ({ text: chunk.text })),
      });

      return { success: true };
    } catch (error) {
      console.error("Error storing embeddings:", error);
      return { success: false };
    }
  },
});

const queryEnhancedVectorRagStep = createStep({
  id: "queryEnhancedVectorRag",
  description: "Query the knowledge base using Entity-Enhanced Vector RAG",
  inputSchema: querySchema,
  outputSchema: responseSchema,
  execute: async (context) => {
    const { query, agent } = context.inputData;
    const response = await agent.generate(query);
    return { response: response.text };
  },
});

// Create the workflow
export const enhancedVectorRagWorkflow = createWorkflow({
  id: "enhancedVectorRagWorkflow",
  description: "Process documents, generate embeddings, and enable entity-enhanced vector RAG queries",
  inputSchema: processDocumentsSchema,
  outputSchema: responseSchema,
  steps: [
    processDocumentsStep,
    generateEmbeddingsStep,
    storeEmbeddingsStep,
    queryEnhancedVectorRagStep,
  ],
});
