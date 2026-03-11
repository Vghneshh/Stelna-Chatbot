const mongoose = require("mongoose");

async function saveChatHistory(sessionId, userMessage, botReply) {
  await mongoose.connection.db.collection("chat_history").insertOne({
    sessionId,
    userMessage,
    botReply,
    createdAt: new Date()
  });
}

async function handleClosure(session, message) {
  const botReply = "Glad I could help 👍";

  await saveChatHistory(session, message, botReply);

  return {
    reply: `${botReply}\n\nFeel free to reach out if you need assistance with materials, processes, or product design.`
  };
}

module.exports = { handleClosure };
