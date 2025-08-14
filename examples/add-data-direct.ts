import { mastra } from '../src/mastra/index.js';
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { MDocument } from '@mastra/rag';

async function addDataDirectly() {
  console.log('📚 Adding Data Directly to Vector Store\n');

  try {
    const vectorStore = mastra.getVector('pgVector');

    // Sample text to add
    const sampleText = `
    Riverdale Heights is a historic neighborhood established in 1902 by the Rossi family.
    The community has grown from 12 homes to over 1,200 households today.
    The Riverdale Railway Station, built in 1925, serves as a major transportation hub.
    Current population is approximately 2,500 residents with 1,800 local jobs.
    Property values have increased by 15% annually since 2018.
    `;

    console.log('📄 Step 1: Processing text into chunks...');

    // Create document and chunk it
    const doc = MDocument.fromText(sampleText);
    const chunks = await doc.chunk({
      strategy: "recursive",
      size: 256,
      overlap: 50,
    });

    console.log(`✅ Created ${chunks.length} chunks\n`);

    // Generate embeddings
    console.log('🧠 Step 2: Generating embeddings...');
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks.map(chunk => chunk.text),
    });

    console.log(`✅ Generated ${embeddings.length} embeddings\n`);

    // Skip index creation since table already exists
    console.log('🏗️ Step 3: Skipping index creation (table already exists)...');
    console.log('✅ Proceeding with data storage...\n');

    // Store embeddings with detailed entity logging
    console.log('💾 Step 4: Storing embeddings with entities...');

    const chunksWithEntities = chunks.map(chunk => {
      const entities = extractSimpleEntities(chunk.text);
      return {
        text: chunk.text,
        entities: entities
      };
    });

    // Log nodes and relationships being created
    console.log('\n🔗 NODES AND RELATIONSHIPS BEING CREATED:');
    console.log('═'.repeat(80));

    chunksWithEntities.forEach((chunkData, index) => {
      console.log(`\n📄 Chunk ${index + 1}:`);
      console.log(`Text: "${chunkData.text.substring(0, 100)}..."`);
      console.log(`Nodes (Entities): [${chunkData.entities.join(', ')}]`);

      // Show potential relationships
      if (chunkData.entities.length > 1) {
        console.log('Potential Relationships:');
        for (let i = 0; i < chunkData.entities.length; i++) {
          for (let j = i + 1; j < chunkData.entities.length; j++) {
            console.log(`  • ${chunkData.entities[i]} ↔ ${chunkData.entities[j]} (co-occurrence)`);
          }
        }
      }
    });

    // Enhanced relationship analysis
    console.log('\n🔍 DETAILED RELATIONSHIP ANALYSIS:');
    console.log('═'.repeat(80));

    // Analyze entity frequency and importance
    const entityFrequency = new Map<string, number>();
    chunksWithEntities.forEach(chunk => {
      chunk.entities.forEach(entity => {
        entityFrequency.set(entity, (entityFrequency.get(entity) || 0) + 1);
      });
    });

    console.log('\n📊 Entity Frequency Analysis:');
    const sortedEntities = Array.from(entityFrequency.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedEntities.forEach(([entity, count]) => {
      console.log(`  • "${entity}": ${count} occurrences`);
    });

    // Identify key entities (appearing in multiple chunks)
    const keyEntities = sortedEntities.filter(([_, count]) => count > 1);
    console.log(`\n🎯 Key Entities (multi-chunk): [${keyEntities.map(([entity]) => entity).join(', ')}]`);

    // Show relationship strength based on co-occurrence
    console.log('\n💪 Relationship Strength Analysis:');
    const relationshipStrength = new Map<string, number>();

    chunksWithEntities.forEach(chunk => {
      for (let i = 0; i < chunk.entities.length; i++) {
        for (let j = i + 1; j < chunk.entities.length; j++) {
          const pair = `${chunk.entities[i]} ↔ ${chunk.entities[j]}`;
          relationshipStrength.set(pair, (relationshipStrength.get(pair) || 0) + 1);
        }
      }
    });

    const sortedRelationships = Array.from(relationshipStrength.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedRelationships.forEach(([relationship, strength]) => {
      console.log(`  • ${relationship}: strength ${strength}`);
    });

    // Show cross-chunk relationships
    console.log('\n🌐 CROSS-CHUNK RELATIONSHIPS:');
    console.log('═'.repeat(80));

    const allEntities = new Set<string>();
    chunksWithEntities.forEach(chunk => {
      chunk.entities.forEach(entity => allEntities.add(entity));
    });

    console.log(`Total Unique Entities: ${allEntities.size}`);
    console.log(`All Entities: [${Array.from(allEntities).join(', ')}]`);

    // Find shared entities across chunks
    const entityChunkMap = new Map<string, number[]>();
    chunksWithEntities.forEach((chunk, chunkIndex) => {
      chunk.entities.forEach(entity => {
        if (!entityChunkMap.has(entity)) {
          entityChunkMap.set(entity, []);
        }
        entityChunkMap.get(entity)!.push(chunkIndex);
      });
    });

    console.log('\nShared Entities Across Chunks:');
    entityChunkMap.forEach((chunkIndices, entity) => {
      if (chunkIndices.length > 1) {
        console.log(`  • "${entity}" appears in chunks: [${chunkIndices.map(i => i + 1).join(', ')}]`);
      }
    });

    await vectorStore.upsert({
      indexName: "embeddings",
      vectors: embeddings,
      metadata: chunksWithEntities,
    });

    console.log('\n✅ Data stored successfully with entity metadata!\n');

      // Test retrieval with Entity-Enhanced Vector RAG analysis
  console.log('🔍 Step 5: Testing Entity-Enhanced Vector RAG retrieval...');
    const testQuery = "What is the population of Riverdale Heights?";

    console.log(`\n🔍 QUERY ANALYSIS:`);
    console.log('═'.repeat(80));
    console.log(`Query: "${testQuery}"`);

    // Extract entities from query
    const queryEntities = extractSimpleEntities(testQuery);
    console.log(`Query Entities: [${queryEntities.join(', ')}]`);

    const { embeddings: queryEmbeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: [testQuery],
    });

    const results = await vectorStore.query({
      indexName: "embeddings",
      queryVector: queryEmbeddings[0],
      topK: 3,
      includeVector: false,
    });

    console.log(`\n📊 RETRIEVAL RESULTS:`);
    console.log('═'.repeat(80));
    console.log(`Results found: ${results.length}`);

    results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log(`Text: "${result.metadata?.text?.substring(0, 100)}..."`);
      console.log(`Score: ${result.score}`);
      console.log(`Entities: [${result.metadata?.entities?.join(', ') || 'None'}]`);

      // Show entity overlap with query
      if (result.metadata?.entities) {
        const overlap = result.metadata.entities.filter((entity: string) =>
          queryEntities.includes(entity)
        );
        console.log(`Entity Overlap: [${overlap.join(', ')}] (${overlap.length} matches)`);
      }
    });

      // Show Entity-Enhanced Vector RAG relationships
  console.log(`\n🔗 ENTITY-ENHANCED VECTOR RAG RELATIONSHIPS:`);
    console.log('═'.repeat(80));

    const allResultEntities = new Set<string>();
    results.forEach(result => {
      if (result.metadata?.entities) {
        result.metadata.entities.forEach((entity: string) => allResultEntities.add(entity));
      }
    });

    console.log(`All Result Entities: [${Array.from(allResultEntities).join(', ')}]`);

    // Show relationships between query and result entities
    console.log('\nQuery → Result Entity Relationships:');
    queryEntities.forEach(queryEntity => {
      const relatedEntities = Array.from(allResultEntities).filter(resultEntity =>
        resultEntity !== queryEntity
      );
      if (relatedEntities.length > 0) {
        console.log(`  • "${queryEntity}" → [${relatedEntities.join(', ')}]`);
      }
    });

      // Enhanced Entity-Enhanced Vector RAG analysis
  console.log('\n🧠 ENTITY-ENHANCED VECTOR RAG INTELLIGENCE ANALYSIS:');
    console.log('═'.repeat(80));

    // Analyze query intent and entity matching
    console.log('\n🎯 Query Intent Analysis:');
    console.log(`Query: "${testQuery}"`);
    console.log(`Query Entities: [${queryEntities.join(', ')}]`);
    console.log(`Query Type: ${queryEntities.includes('what') ? 'Information Request' : 'Other'}`);

    // Show entity matching scores
    console.log('\n📈 Entity Matching Scores:');
    results.forEach((result, index) => {
      if (result.metadata?.entities) {
        const matchingEntities = result.metadata.entities.filter((entity: string) =>
          queryEntities.includes(entity)
        );
        const matchScore = (matchingEntities.length / queryEntities.length) * 100;
        console.log(`  • Result ${index + 1}: ${matchScore.toFixed(1)}% entity match`);
        console.log(`    Matching: [${matchingEntities.join(', ')}]`);
      }
    });

    // Show semantic relationships
    console.log('\n🔗 Semantic Relationship Mapping:');
    const semanticGroups = new Map<string, string[]>();

    // Group entities by semantic similarity
    const allResultEntitiesArray = Array.from(allResultEntities);
    allResultEntitiesArray.forEach(entity => {
      const group = entity.includes('riverdale') || entity.includes('heights') ? 'Location' :
                   entity.includes('population') || entity.includes('residents') ? 'Demographics' :
                   entity.includes('jobs') || entity.includes('employment') ? 'Economy' :
                   'Other';

      if (!semanticGroups.has(group)) {
        semanticGroups.set(group, []);
      }
      semanticGroups.get(group)!.push(entity);
    });

    semanticGroups.forEach((entities, group) => {
      console.log(`  • ${group}: [${entities.join(', ')}]`);
    });

    // Show relationship paths
    console.log('\n🛤️ Relationship Paths:');
    queryEntities.forEach(queryEntity => {
      console.log(`\nPath from "${queryEntity}":`);
      // Find direct connections
      const directConnections = allResultEntitiesArray.filter(entity =>
        entity !== queryEntity
      );
      directConnections.forEach(connection => {
        console.log(`  • ${queryEntity} → ${connection} (direct)`);
      });
    });

  } catch (error) {
    console.error('❌ Error adding data directly:', error);
  }
}

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

export { addDataDirectly };

if (import.meta.url === `file://${process.argv[1]}`) {
  addDataDirectly();
}
