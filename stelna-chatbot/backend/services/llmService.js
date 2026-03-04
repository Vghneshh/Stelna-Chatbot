const axios = require("axios");

function normalizeMessages(messages) {
  return Array.isArray(messages)
    ? messages
    : [{ role: "user", content: String(messages || "") }];
}

async function callOpenRouter(messages) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const modelChain = [
    process.env.OPENROUTER_PRIMARY_MODEL,
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free"
  ].filter(Boolean);

  let lastError;

  for (const model of modelChain) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
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
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;

      if (status === 429) {
        console.warn(`OpenRouter rate limited on model '${model}', trying next model...`);
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error("OpenRouter request failed");
}

async function callOpenAI(messages) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
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

async function callSecondaryApi(messages) {
  const apiKey = process.env.SECONDARY_API_KEY;
  const baseUrl = process.env.SECONDARY_API_BASE_URL;
  const model = process.env.SECONDARY_API_MODEL;

  if (!apiKey || !baseUrl || !model) {
    throw new Error("SECONDARY_API_KEY / SECONDARY_API_BASE_URL / SECONDARY_API_MODEL is missing");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const response = await axios.post(
    url,
    {
      model,
      messages,
      temperature: 0.4
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}

async function generateLLMResponse(messages) {
  const normalizedMessages = normalizeMessages(messages);

  const providerOrder = (process.env.LLM_PROVIDER_ORDER || "openrouter,openai,secondary")
    .split(",")
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);

  let lastError;

  for (const provider of providerOrder) {
    try {
      if (provider === "openrouter") {
        return await callOpenRouter(normalizedMessages);
      }

      if (provider === "openai") {
        return await callOpenAI(normalizedMessages);
      }

      if (provider === "secondary") {
        return await callSecondaryApi(normalizedMessages);
      }
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      const isAuthError = status === 401 || status === 403;
      const isRateLimit = status === 429;

      if (isAuthError || isRateLimit || /missing/i.test(err.message || "")) {
        console.warn(`LLM provider '${provider}' unavailable (${status || err.message}), trying next provider...`);
        continue;
      }

      console.error("LLM ERROR:", err.response?.data || err.message);
      throw err;
    }
  }

  console.error("LLM ERROR:", lastError?.response?.data || lastError?.message);
  throw lastError;
}

module.exports = { generateLLMResponse };
