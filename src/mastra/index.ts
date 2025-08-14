
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';
import { PgVector } from '@mastra/pg';
import { enhancedVectorRagWorkflow } from './workflows/enhanced-vector-rag-workflow';
import { enhancedVectorRagAgent } from './agents/enhanced-vector-rag-agent';


// Initialize PgVector for vector storage
const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING || "postgresql://localhost:5432/mastra_rag",
});

export const mastra = new Mastra({
  workflows: {
    enhancedVectorRagWorkflow
  },
  agents: {
    enhancedVectorRagAgent,
  },

  vectors: {
    pgVector,
  },
  storage: new PostgresStore({
    connectionString: process.env.POSTGRES_CONNECTION_STRING || "postgresql://localhost:5432/mastra_rag",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
