require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { generateLLMResponse } = require("./services/llmService");
const { generateEmbedding } = require("./services/embeddingService");
const { searchSimilarDocs } = require("./services/vectorSearchService");
const { extractProductSignals } = require("./ai/productBrain/signalExtractor");

const app = express();
app.use(cors());
app.use(express.json());

// PRC Session State Tracker
const prcSessions = new Map(); // { sessionId: { currentQuestion: number, answers: {...} } }

// Follow-up Detection
function isFollowUp(message) {
  const followUps = ["ok", "okay", "thanks", "thank you", "nice", "cool", "got it"];
  return followUps.includes(message.toLowerCase().trim());
}

// Store last real engineering question
let lastUserQuestion = "";

// 12-Question PRC Flow
const prcQuestions = [
  {
    id: "q1",
    question: "Example:\nA smart water bottle for elderly people that reminds them to drink water."
  },
  {
    id: "q2",
    question: "What's the main thing your product does?\n\nTell me the core functionality in a sentence or two."
  },
  {
    id: "q3",
    question: "Have you built or designed a prototype yet?\n\nDescribe what you have so far."
  },
  {
    id: "q4",
    question: "Have you tested your prototype or validated the core technology?\n\nWhat testing or experiments have you done?"
  },
  {
    id: "q5",
    question: "Do you know how you'll manufacture this at scale?\n\nWhat's your basic manufacturing approach?"
  },
  {
    id: "q6",
    question: "What materials are you planning to use?\n\nWhat do you know about material choices so far?"
  },
  {
    id: "q7",
    question: "Do you have target specs in mind?\n\nThink about size, weight, durability, or design aesthetic."
  },
  {
    id: "q8",
    question: "Does your product need electronics?\n\nOr is it purely mechanical or chemical?"
  },
  {
    id: "q9",
    question: "Are you aware of any safety or compliance standards you need to follow?\n\nThink about regulations in your market."
  },
  {
    id: "q10",
    question: "How do you plan to assemble this product?\n\nWhat's your assembly approach?"
  },
  {
    id: "q11",
    question: "Are there specific areas where you'd need expert help or outside support?\n\nWhere do you feel gaps in knowledge?"
  },
  {
    id: "q12",
    question: "Do you have a clear target market or customer segment in mind?\n\nWho will buy this product?"
  }
];

function getNextPRCQuestion(currentIndex) {
  if (currentIndex < prcQuestions.length) {
    return prcQuestions[currentIndex];
  }
  return null;
}

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

    const lowerMessage = message.toLowerCase().trim();
    const session = sessionId || "anonymous";

    // ===== PRC TRIGGER =====
    if (lowerMessage.includes("check product readiness")) {
      // Initialize PRC session
      prcSessions.set(session, { currentQuestion: 0, answers: {} });
      const q1 = prcQuestions[0];
      return res.json({
        type: "prc_start",
        message: `Great 👍 Let's understand your product idea.\n\nFirst — tell me about the product you're building.\n\n${q1.question}`
      });
    }

    // ===== CHECK IF IN PRC SESSION =====
    const prcSession = prcSessions.get(session);
    if (prcSession) {
      // Store the answer
      const currentQ = prcSession.currentQuestion;
      const questionNumber = currentQ + 1;
      prcSession.answers[`q${questionNumber}`] = message;

      // Special: For Q1, extract product signals for richer auto-fill
      let botMessage = `Got it! 👍`;
      if (currentQ === 0) {
        const extracted = await extractProductSignals(message);
        if (extracted.product) prcSession.productName = extracted.product;
        if (extracted.user) prcSession.userSegment = extracted.user;
        if (extracted.problem) prcSession.problemStatement = extracted.problem;
        if (extracted.domain) prcSession.productDomain = extracted.domain;
        console.log("📊 Extracted product signals from Q1:", extracted);
        
        // Build smart acknowledgment
        let ack = "Got it";
        if (extracted.product) {
          ack = `Nice — a ${extracted.product}`;
        }
        if (extracted.user) {
          ack += ` for ${extracted.user}`;
        }
        ack += ".";
        botMessage = ack;
      }

      // Move to next question
      prcSession.currentQuestion++;

      // Get next question or complete
      const nextQ = getNextPRCQuestion(prcSession.currentQuestion);
      
      if (nextQ) {
        // Only show the next question, briefly acknowledge first
        const questionNum = prcSession.currentQuestion + 1;
        return res.json({
          type: "prc_question",
          message: `${botMessage}\n\n**Question ${questionNum} of 12:**\n\n${nextQ.question}`
        });
      } else {
        // PRC Complete - Redirect to PRC review page
        prcSessions.delete(session);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.json({
          type: "prc_redirect",
          message: `Excellent! You've completed the 12-question assessment. 🎉\n\nLet me take you to your Product Readiness Checklist...`,
          prcUrl: `${frontendUrl}/prc.html`,
          prcAnswers: prcSession.answers
        });
      }
    }

    // ===== CONVERSATION INTENT LAYER - Detect Closure =====
    const closureWords = ["thanks", "thank you", "ok thank you", "ok thanks", "great thanks"];

    const isClosure =
      closureWords.some(word =>
        lowerMessage.includes(word)
      );

    if (isClosure) {
      await mongoose.connection.db.collection("chat_history").insertOne({
        sessionId: session,
        userMessage: message,
        botReply: "Glad I could help 👍",
        createdAt: new Date()
      });

      return res.json({
        reply: "Glad I could help 👍\n\nFeel free to reach out if you need assistance with materials, processes, or product design."
      });
    }

    // ===== FOLLOW-UP DETECTION & CONTEXT MANAGEMENT =====
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

    // ===== REGULAR RAG CHAT FLOW =====
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
      sessionId: session,
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

// ===== SERVER STARTUP =====
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
