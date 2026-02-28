const axios = require("axios");

async function generateEmbedding(text) {
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
}

module.exports = { generateEmbedding };
