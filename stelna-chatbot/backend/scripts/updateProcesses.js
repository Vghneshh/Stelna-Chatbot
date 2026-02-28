require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { generateEmbedding } = require("../services/embeddingService");

function splitIntoChunks(text, chunkSize = 500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

async function updateKnowledgeBase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const collection = mongoose.connection.db.collection("vector_knowledge");

    const knowledgeDir = path.join(__dirname, "../knowledge");
    const files = fs.readdirSync(knowledgeDir);

    for (const file of files) {
      const filePath = path.join(knowledgeDir, file);
      const content = fs.readFileSync(filePath, "utf8");

      const chunks = splitIntoChunks(content, 500);

      console.log(`Processing ${file} → ${chunks.length} chunks`);

      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);

        await collection.insertOne({
          content: chunk,
          embedding,
          source: file,
          createdAt: new Date()
        });

        console.log(`Inserted from ${file} | Length: ${chunk.length}`);
      }
    }

    console.log("✅ Knowledge Base Updated Successfully");
    process.exit();

  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

updateKnowledgeBase();