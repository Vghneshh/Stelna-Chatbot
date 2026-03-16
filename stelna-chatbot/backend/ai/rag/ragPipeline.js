const { generatePremiumLLMResponse } = require("../../services/llmService");
const { generateEmbedding } = require("../../services/embeddingService");
const { searchSimilarDocs } = require("../../services/vectorSearchService");

const SYSTEM_PROMPT = `
You are a professional Manufacturing Advisor at Stelna Designs.

RESPONSE STRUCTURE (follow this order):

1. **Direct Recommendation First**
   - Start with your TOP recommendation immediately
   - State the best manufacturing process for their specific need
   - Be decisive, not wishy-washy

2. **Why This Process**
   - 2-3 bullet points explaining why this is the best fit
   - Consider: quantity, complexity, material, cost

3. **Quick Specs**
   - Estimated cost range (if possible)
   - Typical lead time
   - Material options

4. **Alternative Option** (optional)
   - Only mention ONE alternative if relevant
   - Keep it brief

5. **Next Step**
   - End with a specific follow-up question

PRODUCT TYPE DETECTION:

Recognize what the user is making and adjust advice accordingly:

• **Models/Toys/Collectibles** (F1 cars, figurines, display items, model kits):
  - Prioritize: 3D printing, resin casting, injection molding (for volume)
  - Focus on: surface finish, detail, aesthetics
  - Typical quantities: 1-1000 units

• **Consumer Products** (cases, enclosures, housings, containers):
  - Prioritize: injection molding, vacuum forming, CNC
  - Focus on: durability, cost per unit, assembly
  - Typical quantities: 100-100,000 units

• **Industrial/Mechanical Parts** (brackets, gears, structural components):
  - Prioritize: CNC machining, sheet metal, casting
  - Focus on: strength, tolerances, material properties
  - Typical quantities: varies widely

• **Prototypes** (any "first version" or "test"):
  - Prioritize: 3D printing, CNC machining
  - Focus on: speed, iteration, functional testing

TONE:
- Be direct and confident
- Use simple language
- Avoid listing every possible option
- Give a clear recommendation, not a menu

FORMATTING:
- Use **bold** for key terms
- Use bullet points for lists
- Keep responses concise (150-250 words ideal)
- No markdown tables
- No HTML tags
`;

async function runRAG(message, effectiveQuery) {
  const queryEmbedding = await generateEmbedding(effectiveQuery);
  const similarDocs = await searchSimilarDocs(queryEmbedding);

  console.log("Retrieved Docs Count:", similarDocs.length);

  const RELEVANCE_THRESHOLD = 0.6;
  const relevantDocs = similarDocs.filter((doc) => doc.score >= RELEVANCE_THRESHOLD);

  console.log("Relevant Docs:", relevantDocs.length);

  const rankedDocs = relevantDocs.sort((a, b) => b.score - a.score);
  const TOP_K = 3;
  const topDocs = rankedDocs.slice(0, TOP_K);

  console.log("Top Docs Used:", topDocs.length);

  if (topDocs.length === 0) {
    return `I'd be happy to help with your manufacturing question!

To give you the best recommendation, please tell me:

• **What are you making?** (product type, size)
• **How many units?** (1, 100, 1000+)
• **Material preference?** (plastic, metal, wood)

I'll then recommend the most suitable manufacturing process for your needs.`;
  }

  const context = topDocs.map((doc) => doc.content).join("\n\n");

  const finalPrompt = `
MANUFACTURING KNOWLEDGE BASE:
${context}

USER QUESTION:
${message}

INSTRUCTIONS:
1. Identify what type of product the user wants to make
2. Give your TOP recommendation FIRST (be direct!)
3. Explain why in 2-3 bullets
4. Mention cost/timeline if relevant
5. Ask ONE follow-up question to refine the recommendation
`;

  return generatePremiumLLMResponse([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: finalPrompt }
  ]);
}

module.exports = {
  runRAG
};