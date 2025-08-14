-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table for storing embeddings (optional, Mastra will create its own)
-- CREATE TABLE IF NOT EXISTS embeddings (
--   id SERIAL PRIMARY KEY,
--   vector vector(1536),
--   metadata JSONB,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE mastra_rag TO mastra_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mastra_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mastra_user;
