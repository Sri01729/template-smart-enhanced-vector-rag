import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import * as fs from 'fs';
import * as path from 'path';

export const fileUploadTool = createTool({
  id: "fileUpload",
  description: "Upload and process files to add to the knowledge base",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the file to upload"),
    chunkSize: z.number().default(512).describe("Size of each chunk in characters"),
    overlap: z.number().default(50).describe("Overlap between chunks in characters"),
    contentType: z.enum(["auto", "text", "markdown", "json"]).default("auto").describe("Type of content (auto-detect if not specified)"),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the upload was successful"),
    chunksCreated: z.number().describe("Number of chunks created"),
    embeddingsGenerated: z.number().describe("Number of embeddings generated"),
    entitiesExtracted: z.number().describe("Number of entities extracted"),
    message: z.string().describe("Status message"),
  }),
  execute: async ({ context, mastra }: any) => {
    const { filePath, chunkSize = 512, overlap = 50, contentType = "auto" } = context;

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          entitiesExtracted: 0,
          message: `File not found: ${filePath}`
        };
      }

      // Read file content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fileExtension = path.extname(filePath).toLowerCase();

      // Determine content type
      let detectedContentType = contentType;
      if (contentType === "auto") {
        if (fileExtension === '.md' || fileExtension === '.markdown') {
          detectedContentType = "markdown";
        } else if (fileExtension === '.json') {
          detectedContentType = "json";
        } else {
          detectedContentType = "text";
        }
      }

      console.log(`📁 Processing file: ${filePath} (${detectedContentType})`);

      // Create document based on content type
      let doc: MDocument;
      switch (detectedContentType) {
        case "markdown":
          doc = MDocument.fromMarkdown(fileContent);
          break;
        case "json":
          doc = MDocument.fromJSON(fileContent);
          break;
        default:
          doc = MDocument.fromText(fileContent);
      }

      // Chunk the document
      const chunks = await doc.chunk({
        strategy: "recursive",
        size: chunkSize,
        overlap: overlap,
        separator: "\n",
      });

      console.log(`✅ Created ${chunks.length} chunks`);

      // Generate embeddings
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: chunks.map(chunk => chunk.text),
      });

      console.log(`✅ Generated ${embeddings.length} embeddings`);

      // Extract entities from chunks
      const allEntities = new Set<string>();
      chunks.forEach(chunk => {
        const entities = extractSimpleEntities(chunk.text);
        entities.forEach(entity => allEntities.add(entity));
      });

      console.log(`✅ Extracted ${allEntities.size} unique entities`);

      // Get vector store
      const vectorStore = mastra?.getVector("pgVector");
      if (!vectorStore) {
        return {
          success: false,
          chunksCreated: chunks.length,
          embeddingsGenerated: embeddings.length,
          entitiesExtracted: allEntities.size,
          message: "Vector store not found"
        };
      }

      // Create index if it doesn't exist
      try {
        await vectorStore.createIndex({
          indexName: "embeddings",
          dimension: 1536,
        });
      } catch (error) {
        // Index might already exist, continue
        console.log("Index already exists or creation failed, continuing...");
      }

      // Store embeddings with metadata
      await vectorStore.upsert({
        indexName: "embeddings",
        vectors: embeddings,
        metadata: chunks.map(chunk => ({
          text: chunk.text,
          entities: extractSimpleEntities(chunk.text),
          source: filePath,
          contentType: detectedContentType,
          chunkSize,
          overlap
        })),
      });

      console.log(`✅ Stored ${embeddings.length} embeddings in vector store`);

      return {
        success: true,
        chunksCreated: chunks.length,
        embeddingsGenerated: embeddings.length,
        entitiesExtracted: allEntities.size,
        message: `Successfully uploaded ${filePath} to knowledge base`
      };

    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        entitiesExtracted: 0,
        message: `Upload failed: ${errorMessage}`
      };
    }
  },
});

// Simple entity extraction
function extractSimpleEntities(text: string): string[] {
  const entities: string[] = [];

  // Extract potential entities (simple approach)
  const words = text.toLowerCase().split(/\s+/);
  const potentialEntities = words.filter(word =>
    word.length > 3 && /^[a-zA-Z]+$/.test(word)
  );

  // Remove duplicates and common words
  const commonWords = ['the', 'and', 'with', 'that', 'this', 'have', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'her', 'if', 'will', 'up', 'one', 'about', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'time', 'two', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'];

  potentialEntities.forEach(word => {
    if (!commonWords.includes(word) && !entities.includes(word)) {
      entities.push(word);
    }
  });

  return entities.slice(0, 10); // Limit to 10 entities
}
