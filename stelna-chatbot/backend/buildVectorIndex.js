require("dotenv").config();
const { MongoClient } = require("mongodb");
const { generateEmbedding } = require("./services/embeddingService");
const processKB = require("./data/processKB.json");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function buildVectorIndex() {
  await client.connect();
  const db = client.db("manufacturing_ai");
  const collection = db.collection("vector_knowledge");

  await collection.deleteMany({}); // clear old

  for (const item of processKB) {
    const textContent = `
Process: ${item.process}
Description: ${item.description}
Tolerance: ${item.tolerance}
Materials: ${item.materials.join(", ")}
`;

    const embedding = await generateEmbedding(textContent);

    await collection.insertOne({
      content: textContent,
      embedding: embedding
    });

    console.log(`Indexed: ${item.process}`);
  }

  console.log("Vector index built successfully.");
  process.exit();
}

buildVectorIndex();