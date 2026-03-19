const { pipeline } = require("@xenova/transformers");

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log("[Embedding] Loading local model (first time may take a minute)...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("[Embedding] Model loaded!");
  }
  return embedder;
}

async function generateEmbedding(text) {
  try {
    const embed = await getEmbedder();
    const output = await embed(text, { pooling: "mean", normalize: true });
    // Convert to regular array
    return Array.from(output.data);
  } catch (err) {
    console.error("EMBEDDING ERROR:", err.message);
    throw err;
  }
}

module.exports = { generateEmbedding };
