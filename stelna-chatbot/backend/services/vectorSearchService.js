const mongoose = require("mongoose");

async function searchSimilarDocs(embedding) {
  const results = await mongoose.connection.db
    .collection("vector_knowledge")
    .aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 100,
          limit: 5
        }
      },
      {
        $project: {
          content: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ])
    .toArray();

  return results;
}

module.exports = { searchSimilarDocs };
