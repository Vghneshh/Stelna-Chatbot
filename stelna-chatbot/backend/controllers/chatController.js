const { isFollowUp, isClosure } = require("../utils/followUpDetector");
const { handlePRC } = require("../handlers/prcHandler");
const { handleFollowUp } = require("../handlers/followUpHandler");
const { handleClosure } = require("../handlers/closureHandler");
const { handleRAG } = require("../handlers/ragHandler");
const {
  getSessionKey,
  setLastUserQuestion
} = require("../memory/sessionManager");

async function chat(req, res) {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Message required." });
    }

    const session = getSessionKey(sessionId);

    // PRC logic
    const prcResult = await handlePRC(session, message);
    if (prcResult) {
      return res.json(prcResult);
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
