import { Tool } from "@mastra/core/tools";
import { MDocument } from "@mastra/rag";
import { z } from "zod";

const inputSchema = z.object({
  content: z.string().describe("Document content to process (text, markdown, HTML, or JSON)"),
  contentType: z.enum(["text", "markdown", "html", "json"]).default("text").describe("Type of content being processed"),
  chunkSize: z.number().default(512).describe("Size of each chunk in characters"),
  overlap: z.number().default(50).describe("Overlap between chunks in characters"),
  strategy: z.enum(["recursive", "character", "token", "markdown", "html", "json", "latex"]).default("recursive").describe("Chunking strategy to use"),
});

const outputSchema = z.object({
  success: z.boolean(),
  chunks: z.array(z.object({
    text: z.string(),
    metadata: z.record(z.any()).optional(),
  })).optional(),
  totalChunks: z.number().optional(),
  error: z.string().optional(),
});

export const documentTool = new Tool({
  id: "documentProcessor",
  description: "Process and chunk documents for embedding and storage",
  inputSchema,
  outputSchema,

  async execute(context) {
    const { content, contentType = "text", chunkSize = 512, overlap = 50, strategy = "recursive" } = context.context;
    try {
      let doc: MDocument;

      // Create document based on content type
      switch (contentType) {
        case "markdown":
          doc = MDocument.fromMarkdown(content);
          break;
        case "html":
          doc = MDocument.fromHTML(content);
          break;
        case "json":
          doc = MDocument.fromJSON(content);
          break;
        default:
          doc = MDocument.fromText(content);
      }

      // Chunk the document
      const chunks = await doc.chunk({
        strategy: strategy,
        size: chunkSize,
        overlap: overlap,
        separator: "\n",
      });

      return {
        success: true,
        chunks: chunks.map(chunk => ({
          text: chunk.text,
          metadata: chunk.metadata,
        })),
        totalChunks: chunks.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
