import { classifyIntent } from "./intentClassifier.js";
import { decideManufacturingProcess } from "./processEngine.js";
import { getKnowledgeContext } from "./ragService.js";
import { generateExplanation } from "./explanationService.js";
import { embedQuery } from "../services/embeddingService.js";
import { handleGreeting } from "./conversationService.js";
import { handleProductCreation } from "./productChatService.js";

export async function runHybridDecision(userQuery, partSpecs = {}) {

  const intent = classifyIntent(userQuery);

  // 👋 Stop early if greeting
  if (intent === "GREETING") {
    return handleGreeting();
  }

  if (intent === "PRODUCT_CREATION") {
    return handleProductCreation(userQuery);
  }

  let decision = null;
  let context = null;

  if (intent === "PROCESS_SELECTION") {
    decision = decideManufacturingProcess(partSpecs);
  }

  const embedding = await embedQuery(userQuery);
  context = await getKnowledgeContext(embedding);

  const explanation = await generateExplanation({
    decision,
    context,
    userQuery
  });

  return {
    intent,
    decision,
    explanation
  };
}
