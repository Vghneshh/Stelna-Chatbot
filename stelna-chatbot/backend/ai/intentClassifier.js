export function classifyIntent(query) {
  const q = query.toLowerCase().trim();

  // 👋 Greeting detection
  const greetings = ["hi", "hello", "hey", "good morning", "good evening"];

  if (greetings.includes(q)) {
    return "GREETING";
  }

  if (
    q.includes("i want to manufacture") ||
    q.includes("i want to make") ||
    q.includes("i want to build") ||
    q.includes("i want to produce")
  ) {
    return "PRODUCT_CREATION";
  }

  if (
    q.includes("how to manufacture") ||
    q.includes("best process") ||
    q.includes("which process") ||
    q.includes("manufacturing method")
  ) {
    return "PROCESS_SELECTION";
  }

  if (
    q.includes("tolerance") ||
    q.includes("material") ||
    q.includes("difference") ||
    q.includes("what is")
  ) {
    return "KNOWLEDGE";
  }

  return "GENERAL";
}
