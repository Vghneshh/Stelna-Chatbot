const { isFollowUp, isClosure } = require("../utils/followUpDetector");
const { handlePRC } = require("../handlers/prcHandler");
const { handleFollowUp } = require("../handlers/followUpHandler");
const { handleClosure } = require("../handlers/closureHandler");
const { handleRAG } = require("../handlers/ragHandler");
const {
  getSessionKey,
  setLastUserQuestion,
  deletePRCSession,
  markPRCCompleted,
  isPRCCompleted
} = require("../memory/sessionManager");

async function chat(req, res) {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Message required." });
    }

    const session = getSessionKey(sessionId);

    // If user selects "Get Manufacturing Guidance", clear any active PRC session
    // and switch to normal RAG chat mode
    if (String(message || "").toLowerCase().includes("get manufacturing guidance")) {
      await deletePRCSession(session);
      return res.json({
        reply: "Great! I'm here to help with your manufacturing questions.\n\nYou can ask me about:\n• Materials and their properties\n• Manufacturing processes\n• Design considerations\n• Cost estimation\n• Tolerances and specifications\n\nWhat would you like to know?"
      });
    }

    // PRC logic
    const prcResult = await handlePRC(session, message);
    if (prcResult) {
      if (prcResult.type === "prc_redirect") {
        markPRCCompleted(session);
      }
      return res.json(prcResult);
    }

    // Block free-text after PRC is completed — show options instead
    if (isPRCCompleted(session)) {
      return res.json({
        type: "prc_question",
        message: "You've completed the assessment. Choose an option below to continue.",
        options: ["Check Product Readiness", "Get Manufacturing Guidance"]
      });
    }

    // Closure logic
    if (isClosure(message)) {
      const result = await handleClosure(session, message);
      return res.json(result);
    }

    // Follow-up logic
    if (isFollowUp(message)) {
      const result = handleFollowUp(session);
      return res.json(result);
    }

    setLastUserQuestion(session, message);

    const result = await handleRAG(session, message, message);
    return res.json(result);
  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    return res.status(500).json({ reply: "Something went wrong." });
  }
}

module.exports = { chat };
