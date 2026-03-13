const axios = require("axios");
const Groq = require("groq-sdk");

// Provider 1: Groq (fast, generous free tier)
async function generateWithGroq(messages) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
    temperature: 0.4
  });

  return completion.choices[0].message.content;
}

// Provider 2: OpenRouter
async function generateWithOpenRouter(messages) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "nvidia/nemotron-3-nano-30b-a3b:free",
      messages,
      temperature: 0.4
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}

// Provider 3: OpenAI (if configured)
async function generateWithOpenAI(messages) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}

// Main function with automatic fallback
async function generateLLMResponse(messages) {
  const providers = [];

  // Build provider list based on available API keys
  if (process.env.GROQ_API_KEY) {
    providers.push({ name: "Groq", fn: generateWithGroq });
  }
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({ name: "OpenRouter", fn: generateWithOpenRouter });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: "OpenAI", fn: generateWithOpenAI });
  }

  if (providers.length === 0) {
    throw new Error("No LLM provider configured. Add GROQ_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY to .env");
  }

  let lastError;

  for (const provider of providers) {
    try {
      console.log(`[LLM] Trying ${provider.name}...`);
      const result = await provider.fn(messages);
      console.log(`[LLM] ${provider.name} succeeded`);
      return result;
    } catch (err) {
      console.warn(`[LLM] ${provider.name} failed:`, err.response?.data?.error?.message || err.message);
      lastError = err;
    }
  }

  console.error("[LLM] All providers failed");
  throw lastError;
}

module.exports = { generateLLMResponse };
