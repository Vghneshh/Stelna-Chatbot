const { generateLLMResponse } = require("../../services/llmService");
const { generateEmbedding } = require("../../services/embeddingService");
const { searchSimilarDocs } = require("../../services/vectorSearchService");

const SYSTEM_PROMPT = `
You are a professional Manufacturing Advisor.

Tone Guidelines:

- Be structured and technically clear.
- Use concise engineering explanations.
- Maintain a friendly but professional tone.
- Brief conversational phrases like
  "Nice", "Glad you found it useful",
  or "How can I help further?"
  are allowed when appropriate.

Formatting Rules:

1. Use headings where helpful.
2. Use bullet points for recommendations.
3. Avoid repeating the same suggestions.
4. Keep responses concise and relevant.
5. End with a clear next step or follow-up question.
6. Do NOT use markdown tables.
7. Do NOT use HTML tags like <br>.
8. Use headings and bullet points only.

Maintain balance between professionalism and approachability.
`;

async function runRAG(message, effectiveQuery) {
  const queryEmbedding = await generateEmbedding(effectiveQuery);
  const similarDocs = await searchSimilarDocs(queryEmbedding);

  console.log("Retrieved Docs Count:", similarDocs.length);

  const RELEVANCE_THRESHOLD = 0.6;
  const relevantDocs = similarDocs.filter((doc) => doc.score >= RELEVANCE_THRESHOLD);

  console.log("Relevant Docs:", relevantDocs.length);

  const rankedDocs = relevantDocs.sort((a, b) => b.score - a.score);
  const TOP_K = 3;
  const topDocs = rankedDocs.slice(0, TOP_K);

  console.log("Top Docs Used:", topDocs.length);

  if (topDocs.length === 0) {
    return `I specialize in manufacturing and engineering topics.

I may not be the best source for this question.

Would you like help with:

- Material selection
- Manufacturing processes
- Cost optimization
- Product design?`;
  }

  const context = topDocs.map((doc) => doc.content).join("\n\n");

  const finalPrompt = `
You are a professional manufacturing advisor.

Use the provided manufacturing context as the primary source for your answer.

You may apply general engineering reasoning where needed,
but do not contradict the provided context.

If the question is outside manufacturing scope, respond accordingly.

Manufacturing Context:
${context}

User Question:
${message}
`;

  return generateLLMResponse([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: finalPrompt }
  ]);
}

module.exports = {
  runRAG
};