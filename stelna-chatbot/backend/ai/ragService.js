const { searchSimilarDocs } = require("../services/vectorSearchService");

async function getKnowledgeContext(queryEmbedding) {
  const docs = await searchSimilarDocs(queryEmbedding);
  return docs.map(d => d.content).join("\n");
}

module.exports = { getKnowledgeContext };
