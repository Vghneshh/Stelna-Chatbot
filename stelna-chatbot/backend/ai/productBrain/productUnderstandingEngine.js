/**
 * Product Understanding Engine
 *
 * Central place to reason about the user's product idea.
 * Combines:
 *  - LLM extraction (rich structured JSON)
 *  - Heuristic / regex extraction
 *  - Confidence-based signal merging
 *  - Projection into the existing PRC signals model (signals.js)
 */

const { generateLLMResponse } = require("../../services/llmService");

// Create an empty understanding state (stored under signals.productUnderstanding)
function createEmptyUnderstanding() {
  return {
    product: "",
    productCategory: "",
    domain: "",
    users: "",
    problem: "",
    keyFeatures: [],
    hasElectronics: false,
    sensors: [],
    connectivity: [],
    materials: [],
    manufacturingMethod: "",
    hasPrototype: false,
    hasTesting: false,
    complianceRequired: false,
    specsMentioned: false,
    assemblyConsidered: false,
    costAwareness: false,
    confidence: {
      product: 0,
      users: 0,
      electronics: 0,
      manufacturing: 0
    }
  };
}

function cloneUnderstanding(u) {
  const base = createEmptyUnderstanding();
  return {
    ...base,
    ...u,
    keyFeatures: Array.isArray(u?.keyFeatures) ? [...u.keyFeatures] : [],
    sensors: Array.isArray(u?.sensors) ? [...u.sensors] : [],
    connectivity: Array.isArray(u?.connectivity) ? [...u.connectivity] : [],
    materials: Array.isArray(u?.materials) ? [...u.materials] : [],
    confidence: {
      ...base.confidence,
      ...(u?.confidence || {})
    }
  };
}

// Merge arrays with uniqueness
function mergeArray(baseArr, newArr) {
  const existing = new Set(baseArr || []);
  (newArr || []).forEach(v => {
    if (v && !existing.has(v)) existing.add(v);
  });
  return Array.from(existing);
}

// Merge booleans: prefer true when any source thinks it's true
function mergeBool(base, incoming) {
  return Boolean(base || incoming);
}

// Merge string with confidence: keep higher-confidence version
function mergeStringWithConfidence(baseValue, baseConf, newValue, newConf) {
  if (!newValue) return { value: baseValue, conf: baseConf };
  if (!baseValue) {
    return { value: newValue, conf: newConf };
  }
  if ((newConf || 0) > (baseConf || 0)) {
    return { value: newValue, conf: newConf };
  }
  // Same value mentioned again – lightly boost confidence
  if (newValue === baseValue) {
    const boosted = Math.min(1, (baseConf || 0) + (newConf || 0.05));
    return { value: baseValue, conf: boosted };
  }
  return { value: baseValue, conf: baseConf };
}

// LLM-based extraction from a single message
async function extractFromLLM(message) {
  const prompt = `
Extract structured product signals from this description. Return JSON only with these fields:

{
  "product": "",
  "productCategory": "",
  "domain": "",
  "users": "",
  "problem": "",
  "keyFeatures": [],
  "hasElectronics": false,
  "sensors": [],
  "connectivity": [],
  "materials": [],
  "manufacturingMethod": "",
  "hasPrototype": false,
  "hasTesting": false,
  "complianceRequired": false,
  "specsMentioned": false,
  "assemblyConsidered": false,
  "costAwareness": false,
  "confidence": {
    "product": 0.0,
    "users": 0.0,
    "electronics": 0.0,
    "manufacturing": 0.0
  }
}

User message:
"${message}"

Guidelines:
- product: short label, e.g. "smart watch"
- users: target user group, e.g. "elderly people"
- problem: 1-sentence problem statement
- domain: category, e.g. "wearable electronics"
- keyFeatures: short phrases like "heart rate monitoring"
- hasElectronics: true if clearly smart/electronic/IoT
- sensors: sensor types if mentioned
- connectivity: channels like "bluetooth", "wifi"
- materials: likely materials mentioned
- manufacturingMethod: text like "injection molding", "3D printing", "CNC"
- hasPrototype: true if any prototype exists
- hasTesting: true if any testing/validation was done
- complianceRequired: true if regulations/standards are referenced
- specsMentioned: true if size/weight/durability/etc. are mentioned
- assemblyConsidered: true if assembly approach is mentioned
- costAwareness: true if cost or budget mentioned

Set confidences between 0 and 1.0. If something is not mentioned, leave strings empty, arrays empty, booleans false, and confidence 0.0.
Return ONLY the JSON object, no extra text.`;

  try {
    const response = await generateLLMResponse([
      {
        role: "system",
        content: "You extract structured product signals. Return only valid JSON."
      },
      { role: "user", content: prompt }
    ]);

    let cleaned = (response || "").trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/i, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/i, "").replace(/```$/i, "");
    }

    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.warn("ProductUnderstandingEngine: LLM extraction failed:", err.message);
    return null;
  }
}

// Heuristic extraction based on keywords/regex
function extractHeuristics(message) {
  const text = (message || "").toLowerCase();
  const u = createEmptyUnderstanding();

  // Electronics keywords
  const electronicsWords = [
    "smart watch",
    "smartwatch",
    "smart band",
    "iot",
    "sensor",
    "bluetooth",
    "wifi",
    "wireless",
    "app",
    "display",
    "screen",
    "pcb",
    "microcontroller"
  ];
  if (electronicsWords.some(w => text.includes(w))) {
    u.hasElectronics = true;
    u.confidence.electronics = 0.8;
  }

  // User groups
  if (/\belder(ly|s)?\b/.test(text) || text.includes("old people") || text.includes("seniors")) {
    u.users = "elderly people";
    u.confidence.users = 0.8;
  } else if (text.includes("children") || text.includes("kids") || text.includes("toddlers")) {
    u.users = "children";
    u.confidence.users = 0.8;
  } else if (text.includes("patient")) {
    u.users = "patients";
    u.confidence.users = 0.7;
  } else if (text.includes("athlete") || text.includes("sports") || text.includes("fitness")) {
    u.users = "athletes";
    u.confidence.users = 0.7;
  } else if (text.includes("farmer") || text.includes("agri")) {
    u.users = "farmers";
    u.confidence.users = 0.7;
  }

  // Manufacturing hints
  if (
    text.includes("injection molding") ||
    text.includes("injection moulding") ||
    text.includes("3d print") ||
    text.includes("3d printing") ||
    text.includes("cnc") ||
    text.includes("machining") ||
    text.includes("die casting")
  ) {
    u.manufacturingMethod = (text.match(
      /(injection molding|injection moulding|3d printing|3d print|cnc|machining|die casting)/i
    ) || [""])[0];
    u.confidence.manufacturing = 0.7;
  }

  // Materials
  const materialMap = [
    "plastic",
    "aluminum",
    "aluminium",
    "stainless steel",
    "steel",
    "silicone",
    "rubber"
  ];
  u.materials = materialMap.filter(m => text.includes(m));

  // Prototype / testing / assembly / cost / specs
  if (text.includes("prototype") || text.includes("mockup") || text.includes("mock-up") || text.includes("3d print")) {
    u.hasPrototype = true;
  }
  if (text.includes("testing") || text.includes("validated") || text.includes("trial") || text.includes("experiment")) {
    u.hasTesting = true;
  }
  if (text.includes("assemble") || text.includes("assembly") || text.includes("put together")) {
    u.assemblyConsidered = true;
  }
  if (text.includes("cost") || text.includes("budget") || text.includes("per unit")) {
    u.costAwareness = true;
  }
  if (
    text.includes("size") ||
    text.includes("weight") ||
    text.includes("dimensions") ||
    text.includes("durability")
  ) {
    u.specsMentioned = true;
  }
  if (
    text.includes("ce") ||
    text.includes("iec") ||
    text.includes("fda") ||
    text.includes("standard") ||
    text.includes("compliance") ||
    text.includes("regulation")
  ) {
    u.complianceRequired = true;
  }

  // Sensors & connectivity quick pass
  if (text.includes("heart rate")) u.sensors.push("heart rate sensor");
  if (text.includes("temperature")) u.sensors.push("temperature sensor");
  if (text.includes("accelerometer") || text.includes("motion")) u.sensors.push("motion/accelerometer");

  if (text.includes("bluetooth")) u.connectivity.push("bluetooth");
  if (text.includes("wifi")) u.connectivity.push("wifi");
  if (text.includes("cellular") || text.includes("4g") || text.includes("lte")) u.connectivity.push("cellular");

  return u;
}

// Merge new understanding into existing, respecting confidence
function mergeUnderstanding(base, incoming) {
  const current = cloneUnderstanding(base);
  const inc = cloneUnderstanding(incoming);

  // Straightforward booleans / arrays
  current.hasElectronics = mergeBool(current.hasElectronics, inc.hasElectronics);
  current.hasPrototype = mergeBool(current.hasPrototype, inc.hasPrototype);
  current.hasTesting = mergeBool(current.hasTesting, inc.hasTesting);
  current.complianceRequired = mergeBool(current.complianceRequired, inc.complianceRequired);
  current.specsMentioned = mergeBool(current.specsMentioned, inc.specsMentioned);
  current.assemblyConsidered = mergeBool(current.assemblyConsidered, inc.assemblyConsidered);
  current.costAwareness = mergeBool(current.costAwareness, inc.costAwareness);

  current.keyFeatures = mergeArray(current.keyFeatures, inc.keyFeatures);
  current.sensors = mergeArray(current.sensors, inc.sensors);
  current.connectivity = mergeArray(current.connectivity, inc.connectivity);
  current.materials = mergeArray(current.materials, inc.materials);

  // Strings with confidence
  let merged;

  merged = mergeStringWithConfidence(
    current.product,
    current.confidence.product,
    inc.product,
    inc.confidence.product || 0.7
  );
  current.product = merged.value;
  current.confidence.product = merged.conf;

  merged = mergeStringWithConfidence(
    current.users,
    current.confidence.users,
    inc.users,
    inc.confidence.users || 0.7
  );
  current.users = merged.value;
  current.confidence.users = merged.conf;

  merged = mergeStringWithConfidence(
    current.domain,
    current.confidence.domain || 0,
    inc.domain,
    inc.confidence.domain || 0.6
  );
  current.domain = merged.value;
  current.confidence.domain = merged.conf;

  merged = mergeStringWithConfidence(
    current.problem,
    current.confidence.problem || 0,
    inc.problem,
    inc.confidence.problem || 0.6
  );
  current.problem = merged.value;
  current.confidence.problem = merged.conf;

  merged = mergeStringWithConfidence(
    current.manufacturingMethod,
    current.confidence.manufacturing,
    inc.manufacturingMethod,
    inc.confidence.manufacturing || 0.6
  );
  current.manufacturingMethod = merged.value;
  current.confidence.manufacturing = merged.conf;

  merged = mergeStringWithConfidence(
    current.productCategory,
    current.confidence.productCategory || 0,
    inc.productCategory,
    inc.confidence.productCategory || 0.6
  );
  current.productCategory = merged.value;
  current.confidence.productCategory = merged.conf;

  // Electronics confidence
  current.confidence.electronics = Math.max(
    current.confidence.electronics || 0,
    inc.confidence.electronics || (inc.hasElectronics ? 0.7 : 0)
  );

  return current;
}

// Project understanding back into the PRC signals model
function applyUnderstandingToSignals(signals, understanding) {
  if (!signals) return;
  const u = understanding;

  // Map high-level product fields
  if (u.product && !signals.productOverview) {
    signals.productOverview = u.product;
  }
  if (u.users && !signals.users) {
    signals.users = u.users;
    signals.userUnderstanding = "enough";
  }
  if (u.problem && !signals.problemClarity) {
    signals.problemClarity = "enough";
  }
  if (u.hasElectronics && signals.electronicsKnowledge !== "enough") {
    signals.electronicsKnowledge = "enough";
  }
  if (u.manufacturingMethod && !signals.manufacturingKnowledge) {
    signals.manufacturingKnowledge = "partial";
  }
  if (u.materials && u.materials.length && !signals.materialsKnowledge) {
    signals.materialsKnowledge = u.materials.join(", ");
  }
  if (u.hasPrototype && !signals.prototypeStatus) {
    signals.prototypeStatus = "exists";
  }
  if (u.hasTesting && !signals.testingStatus) {
    signals.testingStatus = "enough";
  }
  if (u.complianceRequired && !signals.complianceAwareness) {
    signals.complianceAwareness = "partial";
  }
  if (u.specsMentioned && !signals.targetSpecClarity) {
    signals.targetSpecClarity = "partial";
  }
  if (u.costAwareness && !signals.costAwareness) {
    signals.costAwareness = true;
  }
  if (u.assemblyConsidered && !signals.manufacturingClarity) {
    signals.manufacturingClarity = true;
  }
}

/**
 * Main entry point:
 *  - Ensures signals.productUnderstanding exists
 *  - Extracts new understanding from the message (LLM + heuristics)
 *  - Merges with existing understanding (confidence-aware)
 *  - Applies the result back into the PRC signals model
 */
async function analyzeProductMessage(message, signals) {
  if (!signals) return;

  // Initialize nested state
  if (!signals.productUnderstanding) {
    signals.productUnderstanding = createEmptyUnderstanding();
  }

  const current = cloneUnderstanding(signals.productUnderstanding);

  // 1) LLM extraction
  const llmResult = await extractFromLLM(message);
  let merged = current;
  if (llmResult) {
    merged = mergeUnderstanding(merged, llmResult);
  }

  // 2) Heuristic extraction
  const heuristics = extractHeuristics(message);
  merged = mergeUnderstanding(merged, heuristics);

  // Save back and project into PRC signals
  signals.productUnderstanding = merged;
  applyUnderstandingToSignals(signals, merged);
}

module.exports = {
  analyzeProductMessage,
  createEmptyUnderstanding
};

