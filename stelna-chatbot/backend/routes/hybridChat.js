const express = require("express");
const { runHybridDecision } = require("../ai/orchestrator");

const router = express.Router();

router.post("/hybrid-chat", async (req, res) => {
  try {
    const { query, specs } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const result = await runHybridDecision(query, specs || {});

    res.json(result);
  } catch (err) {
    console.error("HYBRID CHAT ERROR:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
