const axios = require("axios");

async function generateEmbedding(text) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/embeddings",
      {
        model: "openai/text-embedding-3-small",
        input: text
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.data[0].embedding;
  } catch (err) {
    console.error("EMBEDDING ERROR:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { generateEmbedding };
