const mongoose = require("mongoose");
const VectorDoc = require("../models/VectorDoc");
const axios = require("axios");

async function generateEmbedding(text) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/embeddings",
    {
      model: "text-embedding-3-small",
      input: text
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.data[0].embedding;
}

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