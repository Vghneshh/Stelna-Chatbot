require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { generateLLMResponse } = require("./services/llmService");
const { generateEmbedding } = require("./services/embeddingService");
const { searchSimilarDocs } = require("./services/vectorSearchService");

const app = express();
app.use(cors());
app.use(express.json());

// Follow-up Detection
function isFollowUp(message) {
  const followUps = ["ok", "okay", "thanks", "thank you", "nice", "cool", "got it"];
  return followUps.includes(message.toLowerCase().trim());
}

// Store last real engineering question
let lastUserQuestion = "";

const SYSTEM_PROMPT = `
You are a professional Manufacturing Advisor.

Tone Guidelines:

• Be structured and technically clear.
• Use concise engineering explanations.
• Maintain a friendly but professional tone.
• Brief conversational phrases like 
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

app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Message required." });
    }

    // Conversation Intent Layer - Detect Closure
    const closureWords = ["thanks", "thank you", "ok thank you", "ok thanks", "great thanks"];

    const isClosure =
      closureWords.some(word =>
        message.toLowerCase().includes(word)
      );

    if (isClosure) {
      await mongoose.connection.db.collection("chat_history").insertOne({
        sessionId: sessionId || "anonymous",
        userMessage: message,
        botReply: "Glad I could help 👍",
        createdAt: new Date()
      });

      return res.json({
        reply: "Glad I could help 👍\n\nFeel free to reach out if you need assistance with materials, processes, or product design."
      });
    }

    // Follow-up Detection & Context Management
    let effectiveQuery = message;

    if (isFollowUp(message) && lastUserQuestion) {
      console.log("Follow-up detected. Context:", lastUserQuestion);
      effectiveQuery = lastUserQuestion;
    } else {
      lastUserQuestion = message;
    }

    // Early return for follow-ups with polished UX
    if (isFollowUp(message)) {
      return res.json({
        reply: "Glad that helped 👍\n\nWould you like to explore material selection, manufacturing method, or cost considerations next?"
      });
    }

    // 1. Generate embedding using effective query
    const queryEmbedding = await generateEmbedding(effectiveQuery);

    // 2. Retrieve relevant docs
    const similarDocs = await searchSimilarDocs(queryEmbedding);

    console.log("Retrieved Docs Count:", similarDocs.length);

    const RELEVANCE_THRESHOLD = 0.6;

    const relevantDocs = similarDocs.filter(doc => doc.score >= RELEVANCE_THRESHOLD);

    console.log("Relevant Docs:", relevantDocs.length);

    const rankedDocs = relevantDocs.sort((a, b) => b.score - a.score);

    const TOP_K = 3;
    const topDocs = rankedDocs.slice(0, TOP_K);

    console.log("Top Docs Used:", topDocs.length);

    const hasRelevantContext = topDocs.length > 0;

    if (!hasRelevantContext) {
      return res.json({
        reply: `I specialize in manufacturing and engineering topics.

I may not be the best source for this question.

Would you like help with:

• Material selection  
• Manufacturing processes  
• Cost optimization  
• Product design?`
      });
    }

    // 3. Build RAG prompt with relevant context
    let context = topDocs.map((doc) => doc.content).join("\n\n");

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

    // 4. Send to LLM
    const reply = await generateLLMResponse([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: finalPrompt }
    ]);

    // Save to chat history
    await mongoose.connection.db.collection("chat_history").insertOne({
      sessionId: sessionId || "anonymous",
      userMessage: message,
      botReply: reply,
      createdAt: new Date()
    });

    return res.json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    return res.status(500).json({ reply: "Something went wrong." });
  }
});

// 🔹 Connect DB FIRST, then start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(5000, () => {
      console.log("Backend running on port 5000");
    });
  } catch (err) {
    console.error("STARTUP ERROR:", err.message);
    process.exit(1);
  }
};

startServer();
