const { generateLLMResponse } = require("../services/llmService");

async function generateExplanation({ decision, context, userQuery }) {
  const prompt = `
You are a manufacturing advisor.

IMPORTANT:
You are NOT making decisions.
You are ONLY explaining the backend decision.

User Query:
${userQuery}

Backend Decision:
${decision}

Knowledge Context:
${context}

Explain clearly why this manufacturing choice fits.
Do NOT suggest alternatives.
`;

  const reply = await generateLLMResponse([
    { role: "user", content: prompt }
  ]);

  return reply;
}

module.exports = { generateExplanation };
