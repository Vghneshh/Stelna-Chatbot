function shouldSkip(sessionSignals, question) {
  const signal = question?.signal;

  if (!signal || !sessionSignals) return false;

  const signalPath = signal.split(".");
  let value = sessionSignals;

  for (const key of signalPath) {
    value = value?.[key];
  }

  const shouldSkipQuestion = value !== null && value !== undefined && value !== "" && value !== "unknown";
  
  if (shouldSkipQuestion) {
    console.log(`⏭️  SKIP: Question "${question.id}" (${signal} already known: ${value})`);
  }
  
  return shouldSkipQuestion;
}

module.exports = shouldSkip;
