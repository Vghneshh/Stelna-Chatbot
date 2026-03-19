const express = require("express");
const dns = require("dns");
const { chat } = require("../controllers/chatController");
const firebaseDb = require("../config/firebase");
const { markPRCCompleted, getSessionKey } = require("../memory/sessionManager");

const router = express.Router();

router.post("/chat", chat);

// TEST ENDPOINT: Mark a session as PRC completed (for UI testing)
router.post("/test-mark-completed", (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId required" });
    }

    const session = getSessionKey(sessionId);
    markPRCCompleted(session);

    res.json({
      success: true,
      message: `Session ${session} marked as PRC completed`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if email domain has MX records (mail servers exist)
function checkMxRecord(domain) {
  return new Promise((resolve) => {
    dns.resolveMx(domain, (err, records) => {
      resolve(!err && records && records.length > 0);
    });
  });
}

router.post("/user-details", async (req, res) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // MX record check - verify email domain has real mail servers
    const domain = email.trim().toLowerCase().split("@")[1];
    if (domain) {
      const hasMx = await checkMxRecord(domain);
      if (!hasMx) {
        return res.status(400).json({ error: "Email domain does not exist." });
      }
    }

    // Save to Firebase Realtime Database
    const usersRef = firebaseDb.ref("users");
    const newUserRef = usersRef.push();
    await newUserRef.set({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, userId: newUserRef.key });
  } catch (err) {
    console.error("Error saving user details:", err.message);
    res.status(500).json({ error: "Failed to save user details." });
  }
});

module.exports = router;