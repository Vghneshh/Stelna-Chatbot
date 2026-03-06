const followUps = ["ok", "okay", "thanks", "thank you", "nice", "cool", "got it"];
const closureWords = ["thanks", "thank you", "ok thank you", "ok thanks", "great thanks"];

function normalize(input) {
  return String(input || "").toLowerCase().trim();
}

function isFollowUp(message) {
  return followUps.includes(normalize(message));
}

function isClosure(message) {
  const normalized = normalize(message);
  return closureWords.some((word) => normalized.includes(word));
}

module.exports = {
  isFollowUp,
  isClosure
};