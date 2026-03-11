const mongoose = require("mongoose");
const { runRAG } = require("../ai/rag/ragPipeline");

async function saveChatHistory(sessionId, userMessage, botReply) {
  await mongoose.connection.db.collection("chat_history").insertOne({
    sessionId,
    userMessage,
    botReply,
    createdAt: new Date()
  });
}

async function handleRAG(session, message, effectiveQuery) {
  const reply = await runRAG(message, effectiveQuery);

  await saveChatHistory(session, message, reply);

  return { reply };
}

module.exports = { handleRAG };
