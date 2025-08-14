// Example configuration file
// Copy this to config.js and update with your actual values

export const config = {
  // OpenAI API Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',
  },

  // PostgreSQL Database Configuration
  database: {
    connectionString: process.env.POSTGRES_CONNECTION_STRING || 'postgresql://username:password@localhost:5432/mastra_rag',
    // Alternative individual settings:
    // host: process.env.POSTGRES_HOST || 'localhost',
    // port: process.env.POSTGRES_PORT || 5432,
    // user: process.env.POSTGRES_USER || 'your_username',
    // password: process.env.POSTGRES_PASSWORD || 'your_password',
    // database: process.env.POSTGRES_DATABASE || 'mastra_rag',
  },

  // Entity-Enhanced Vector RAG Configuration
enhancedVectorRag: {
    embeddingDimension: 1536,
    similarityThreshold: 0.7,
    randomWalkSteps: 100,
    restartProbability: 0.15,
    chunkSize: 512,
    chunkOverlap: 50,
  },

  // Mastra Configuration
  mastra: {
    logLevel: 'info',
    storageUrl: ':memory:', // Change to file path for persistence
  },
};
