function normalize(text) {
  return (text || "").toLowerCase().trim();
}

async function detectIntent(message) {
  const text = normalize(message);

  if (!text) return "IRRELEVANT";

  const confusedCues = ["don't understand", "dont understand", "confused", "what do you mean", "explain", "not sure"];
  if (confusedCues.some(cue => text.includes(cue))) return "CONFUSED";

  if (text.endsWith("?") || text.startsWith("what ") || text.startsWith("how ") || text.startsWith("why ")) {
    return "QUESTION";
  }

  const irrelevantCues = ["weather", "movie", "sports score", "joke"];
  if (irrelevantCues.some(cue => text.includes(cue))) return "IRRELEVANT";

  return "ANSWER";
}

async function interpretConfidence(message) {
  const text = normalize(message);

  if (!text) return "UNKNOWN";
  if (text.includes("not sure") || text.includes("maybe") || text.includes("guess")) return "GUESSING";
  if (text.includes("partially") || text.includes("somewhat") || text.includes("kind of")) return "PARTIAL";
  return "CONFIDENT";
}

function mapConfidenceToPRC(level) {
  switch (level) {
    case "CONFIDENT":
      return "Know Enough";
    case "PARTIAL":
      return "Know Partially";
    case "GUESSING":
    case "UNKNOWN":
    default:
      return "Don't Know";
  }
}

module.exports = {
  detectIntent,
  interpretConfidence,
  mapConfidenceToPRC
};
