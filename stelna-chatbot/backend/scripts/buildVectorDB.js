require("dotenv").config();
const mongoose = require("mongoose");
const { loadAndChunkKnowledge } = require("../services/chunkServices");
const { generateEmbedding } = require("../services/embeddingService");
const VectorDoc = require("../models/VectorDoc");

mongoose.connect(process.env.MONGO_URI);

async function buildDB() {
  await VectorDoc.deleteMany({});
  console.log("Old knowledge cleared.");

  const chunks = loadAndChunkKnowledge();

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);

    await VectorDoc.create({
      content: chunk,
      embedding: embedding
    });

    console.log("Inserted chunk");
  }

  console.log("Knowledge base indexed.");
  process.exit();
}

buildDB();
