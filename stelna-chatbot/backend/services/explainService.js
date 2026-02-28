const { generateLLMResponse } = require("./llmService");

async function generateSmartExplanation(userQuery, plan) {
  const systemPrompt = `
You are a professional manufacturing advisor.

Rules:
- Keep response under 6 sentences.
- No tables.
- No long tutorials.
- Do NOT change recommended processes.
- Be concise and practical.
`;

  const userPrompt = `
User request:
"${userQuery}"

Recommended manufacturing plan:
${plan.join("\n")}

Explain why this method is suitable.
End with: Would you like pricing or design assistance?
`;

  return await generateLLMResponse([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);
}

module.exports = { generateSmartExplanation };