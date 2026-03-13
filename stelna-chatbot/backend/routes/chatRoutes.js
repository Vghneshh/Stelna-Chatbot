const express = require("express");
const { chat } = require("../controllers/chatController");
const firebaseDb = require("../config/firebase");

const router = express.Router();

router.post("/chat", chat);

router.post("/user-details", async (req, res) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Save to Firebase Realtime Database
    const usersRef = firebaseDb.ref("users");
    const newUserRef = usersRef.push();
    await newUserRef.set({
      fullName,
      email,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, userId: newUserRef.key });
  } catch (err) {
    console.error("Error saving user details:", err.message);
    res.status(500).json({ error: "Failed to save user details." });
  }
});

module.exports = router;