const mongoose = require("mongoose");
const { runRAG } = require("../ai/rag/ragPipeline");

async function saveChatHistory(sessionId, userMessage, botReply) {
  try {
    await mongoose.connection.db.collection("chat_history").insertOne({
      sessionId,
      userMessage,
      botReply,
      createdAt: new Date()
    });
  } catch (err) {
    console.error("Failed to save chat history:", err.message);
  }
}

async function handleRAG(session, message, effectiveQuery) {
  try {
    const reply = await runRAG(message, effectiveQuery);
    await saveChatHistory(session, message, reply);
    return { reply };
  } catch (err) {
    console.error("RAG ERROR:", err.message);

    // Provide a helpful fallback response
    const fallbackReply = `I'd be happy to help you with your manufacturing question!

Here are some general considerations:

**Common Manufacturing Options:**
• CNC machining for precision parts
• 3D printing for prototypes
• Injection molding for high volume
• Laser cutting for sheet materials

**Materials to Consider:**
• Plastics (ABS, acrylic, polycarbonate)
• Metals (aluminum, steel, brass)
• Wood and composites

Could you tell me more about:
• What you're trying to make?
• Quantity needed?
• Material preference?

I'll provide more specific guidance based on your needs!`;

    await saveChatHistory(session, message, fallbackReply);
    return { reply: fallbackReply };
  }
}

module.exports = { handleRAG };
