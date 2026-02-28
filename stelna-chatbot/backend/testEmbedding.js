require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function test() {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "Vacuum casting is ideal for 200 plastic units."
    });

    console.log("Embedding length:", response.data[0].embedding.length);
    console.log("First 5 values:", response.data[0].embedding.slice(0, 5));

  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();