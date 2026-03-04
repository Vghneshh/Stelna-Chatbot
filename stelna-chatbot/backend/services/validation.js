/**
 * PRC validation helpers
 * Provides lightweight guardrails for answer quality
 */

/**
 * Check if answer is relevant to the question context
 */
function isRelevant(questionNumber, answer) {
  const lower = answer.toLowerCase();

  // Q2: Development Roadmap - expect "plan", "roadmap", timeline, etc.
  if (questionNumber === 1) {
    const relevantKeywords = [
      "plan", "roadmap", "timeline", "schedule", "stages", "phases", 
      "steps", "process", "no", "not yet", "developing", "work"
    ];
    return relevantKeywords.some(kw => lower.includes(kw)) || answer.length > 10;
  }

  // Q3: Design/Prototype - expect "sketch", "model", "prototype", "design", 3D, CAD, etc.
  if (questionNumber === 2) {
    const relevantKeywords = [
      "sketch", "prototype", "design", "model", "3d", "cad", "drawing", 
      "rendering", "mockup", "no", "not yet", "planning", "concept"
    ];
    return relevantKeywords.some(kw => lower.includes(kw)) || answer.length > 10;
  }

  // Q4: Science/Engineering - expect understanding indicators
  if (questionNumber === 3) {
    const relevantKeywords = [
      "yes", "no", "understand", "know", "learning", "studying", "physics",
      "math", "principle", "concept", "research"
    ];
    return relevantKeywords.some(kw => lower.includes(kw)) || answer.length > 10;
  }

  // Default: accept anything substantive (3+ characters)
  return answer.trim().length >= 3;
}

/**
 * Validates answer quality
 * Returns: { valid: boolean, reason?: string }
 */
function validateAnswer(questionNumber, answer) {
  // Reject weak/non-committal answers
  const weakAnswers = ["ok", "yes", "no", "hmm", "maybe", "sure", "fine", "fine"];

  if (weakAnswers.includes(answer.toLowerCase().trim())) {
    return {
      valid: false,
      reason: "Please give me more detail about your answer."
    };
  }

  // Check relevance for Q2, Q3, Q4
  if ([1, 2, 3].includes(questionNumber)) {
    if (!isRelevant(questionNumber, answer)) {
      return {
        valid: false,
        reason: "That doesn't seem to answer the question. Could you tell me more?"
      };
    }
  }

  return { valid: true };
}

/**
 * Get clarification text for off-topic answers
 */
function getClarification(questionNumber) {
  const clarifications = {
    1: "Tell me about your development plan. Do you have a timeline or stages?",
    2: "Describe your design. Do you have a sketch, 3D model, or prototype?",
    3: "Explain your understanding of the engineering. What principles are involved?"
  };

  return clarifications[questionNumber] || "Please tell me more about this question.";
}

module.exports = {
  isRelevant,
  validateAnswer,
  getClarification
};
