function buildRagPrompt(docs, userQuery) {
  return `
You are a professional manufacturing advisor.

Use ONLY the provided context to answer.

Context:
${docs.join("\n\n")}

User Question:
${userQuery}

Answer clearly and professionally.
`;
}

module.exports = { buildRagPrompt };
