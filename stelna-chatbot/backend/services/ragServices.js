const mongoose = require("mongoose");
const VectorDoc = require("../models/VectorDoc");
const { generateEmbedding } = require("./embeddingService");

async function retrieveRelevantDocs(query) {
  const embedding = await generateEmbedding(query);

  const results = await mongoose.connection.db
    .collection("vector_knowledge")
    .aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 10,
          limit: 3
        }
      }
    ])
    .toArray();

  return results.map(doc => doc.content);
}

module.exports = { retrieveRelevantDocs };