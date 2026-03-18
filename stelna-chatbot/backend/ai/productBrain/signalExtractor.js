/**
 * Signal Extractor
 * Listens to chatbot answers and updates session signals
 */

const { generateLLMResponse, generatePremiumLLMResponse } = require("../../services/llmService");
const prcQuestions = require("../prc/prcQuestions");

// Dynamically resolve which question covers weightTarget so this code doesn't
// break if the question is renamed or reordered.
const WEIGHT_QUESTION_ID = (prcQuestions.find(
  q => Array.isArray(q.covers) && q.covers.includes("weightTarget")
) || {}).id;

/** Locked vocabulary for knowledge-level signals. Use these instead of raw strings. */
const SIGNAL = {
  ENOUGH:  "enough",
  PARTIAL: "partial",
  UNKNOWN: "unknown"
};

/**
 * Extract core product signals (product, user, problem, domain) from first answer
 * This is used for Q1 to intelligently extract all product metadata at once
 */
async function extractProductSignals(answer) {
  const prompt = `
Extract product signals from this description.

User message:
"${answer}"

Return ONLY JSON.

{
 "product": "",
 "user": "",
 "problem": "",
 "domain": "",
 "hasElectronics": false,
 "wearable": false,
 "interaction": "",
 "environment": ""
}

Rules:
- product = specific device (smart watch, water bottle, etc)
- user = target group
- problem = main purpose
- domain = product category
- hasElectronics = true if smart, IoT, sensor, battery, app etc
- wearable = true if worn on body
- interaction = notification/display/app/button etc
- environment = indoor/outdoor/daily wearable
`;

  try {
    const response = await generateLLMResponse([
      { role: "system", content: "Return only JSON." },
      { role: "user", content: prompt }
    ]);

    const parsed = JSON.parse(response.trim());

    const text = (answer || "").toLowerCase();

    if (parsed.hasElectronics === undefined) {
      parsed.hasElectronics =
        /smart|sensor|bluetooth|wifi|app|electronic|battery/.test(text);
    }

    if (parsed.wearable === undefined) {
      parsed.wearable =
        /watch|band|bracelet|wearable/.test(text);
    }

    return parsed;

  } catch (err) {
    console.error("Signal extraction failed", err);
    return {
      product: "",
      user: "",
      problem: "",
      domain: "",
      hasElectronics: false,
      wearable: false
    };
  }
}

/**
 * Convert binary yes/no/maybe answers to signal values
 * Uses keyword matching as a fast first pass
 */
function interpretBinary(answer) {
  const text = (answer || "").toLowerCase().trim();

  // Clear positive signals
  if (/\b(yes|yeah|yep|yea|sure|have|do|did|already|definitely|absolutely|of course)\b/.test(text)) {
    return SIGNAL.ENOUGH;
  }
  // Clear negative signals
  if (/\b(no|nope|nah|not yet|haven't|don't|doesn't|none|nothing|never)\b/.test(text)) {
    return SIGNAL.UNKNOWN;
  }
  // Partial/uncertain signals
  if (/\b(maybe|think|partially|somewhat|sort of|kind of|a bit|a little|not sure|unsure|possibly)\b/.test(text)) {
    return SIGNAL.PARTIAL;
  }

  // If the answer has real substance (longer descriptive text), treat as enough
  if (text.length > 30) {
    return SIGNAL.ENOUGH;
  }

  // Default to unknown instead of partial - don't assume knowledge
  return SIGNAL.UNKNOWN;
}

/**
 * Safe setter for knowledge-level signals.
 * Accepts "enough" | "partial" | "unknown" directly, or interprets raw answer text.
 * This guarantees all knowledge signals are normalized - even if interpretBinary()
 * is forgotten in a future edit.
 */
function setSignal(signals, key, value) {
  if (value === undefined || value === null) {
    signals[key] = SIGNAL.UNKNOWN;
    return;
  }
  if (value === SIGNAL.ENOUGH || value === SIGNAL.PARTIAL || value === SIGNAL.UNKNOWN) {
    signals[key] = value;
    return;
  }
  signals[key] = interpretBinary(value);
}

function ensureFunctionalSignals(sessionSignals) {
  if (!sessionSignals.functionalFeatures) {
    sessionSignals.functionalFeatures = {
      coreFunctionality: null,
      energyPower: null,
      controlLogic: null,
      userInteraction: null,
      environmentalProtection: null,
      mechanicalStructure: null,
      modularity: null,
      maintenance: null,
      interfaces: null,
      optionalEnhancements: null
    };
  }
}

function ensureFunctionalExamples(sessionSignals) {
  if (!sessionSignals.functionalExamples) {
    sessionSignals.functionalExamples = {
      coreFunctionality: null,
      energyPower: null,
      controlLogic: null,
      userInteraction: null,
      environmentalProtection: null,
      mechanicalStructure: null,
      modularity: null,
      maintenance: null,
      interfaces: null,
      optionalEnhancements: null
    };
  }
}

function buildSignalExtractionPrompt(userAnswer) {
  return `
Extract structured product readiness signals from the message.

User message:
"${userAnswer}"

Extract:
- Functional examples
- Performance targets
- Materials
- Manufacturing method
- Components
- Usage environment
- Testing approach
- Compliance standards
- Production quantity
- Cost target

Return ONLY valid JSON.
IMPORTANT: Only extract information that is EXPLICITLY stated. If the message is vague, gibberish, or does not contain real product information, return an empty object: {}

Example:
{
  "functionalExamples": {
    "coreFunctionality": "Shock protection up to 1.5m"
  },
  "durabilityTarget": "1.5m drop protection",
  "materialsKnowledge": "TPU",
  "productionQuantity": "500 units"
}
`;
}

function safeMergeSignals(sessionSignals, parsed) {
  if (!parsed || typeof parsed !== "object") return;

  // Helper: treat string "null", actual null, undefined, and "" as empty
  const isEmpty = (v) => v === null || v === undefined || v === "" || v === "null";

  // Only write top-level keys when the incoming value is non-empty,
  // so later LLM calls cannot blank out signals set by question handlers.
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "functionalExamples" || key === "functionalFeatures") continue;
    if (!isEmpty(value)) {
      sessionSignals[key] = value;
    }
  }

  if (parsed.functionalExamples && typeof parsed.functionalExamples === "object") {
    ensureFunctionalExamples(sessionSignals);
    // Only fill empty slots - never overwrite values already set
    for (const [key, value] of Object.entries(parsed.functionalExamples)) {
      if (!sessionSignals.functionalExamples[key] && !isEmpty(value)) {
        sessionSignals.functionalExamples[key] = value;
      }
    }
  }

  if (parsed.functionalFeatures && typeof parsed.functionalFeatures === "object") {
    ensureFunctionalSignals(sessionSignals);
    // Only fill empty slots - never overwrite importance set by earlier questions
    for (const [key, value] of Object.entries(parsed.functionalFeatures)) {
      if (!sessionSignals.functionalFeatures[key] && !isEmpty(value)) {
        sessionSignals.functionalFeatures[key] = value;
      }
    }
  }
}

function parseInlineJson(text) {
  if (!text) return null;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const candidate = text.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch (err) {
    return null;
  }
}

async function extractStructuredSignals(userAnswer) {
  const prompt = buildSignalExtractionPrompt(userAnswer);

  try {
    const response = await generatePremiumLLMResponse([
      {
        role: "system",
        content: "Extract structured data and return only valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ]);

    const parsed = parseInlineJson(response) || JSON.parse(response);
    return parsed;
  } catch (err) {
    console.warn("⚠️ Structured extraction failed, continuing with semantic extraction:", err.message);
    return null;
  }
}

function hasTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
}

function classifyFeatureImportance(text) {
  const requiredCues = ["must have", "must", "needs to", "need to", "primary function", "essential", "critical"];
  const optionalCues = ["nice to have", "optional", "add-on", "addon", "could have", "bonus"];

  if (requiredCues.some(cue => text.includes(cue))) return "required";
  if (optionalCues.some(cue => text.includes(cue))) return "optional";
  return "important";
}

function mergeFeatureImportance(currentValue, nextValue) {
  const rank = { optional: 1, important: 2, required: 3, null: 0 };
  const currentRank = rank[currentValue] || 0;
  const nextRank = rank[nextValue] || 0;
  return nextRank >= currentRank ? nextValue : currentValue;
}

function setFunctionalFeature(sessionSignals, key, value) {
  ensureFunctionalSignals(sessionSignals);
  sessionSignals.functionalFeatures[key] = mergeFeatureImportance(
    sessionSignals.functionalFeatures[key],
    value
  );
}

/**
 * Extract functional requirement signals using LLM
 * Provides structured interpretation of feature examples and importance
 */
async function extractFunctionalSignals(answer) {
  const prompt = `
Extract functional requirement signals from the message.

User message:
"${answer}"

Return JSON only.

{
 "functionalExamples": {
   "coreFunctionality": "",
   "energyPower": "",
   "controlLogic": "",
   "userInteraction": "",
   "environmentalProtection": "",
   "mechanicalStructure": "",
   "modularity": "",
   "maintenance": "",
   "interfaces": "",
   "optionalEnhancements": ""
 },
 "functionalFeatures": {
   "coreFunctionality": "required|important|optional|null",
   "energyPower": "required|important|optional|null",
   "controlLogic": "required|important|optional|null",
   "userInteraction": "required|important|optional|null",
   "environmentalProtection": "required|important|optional|null",
   "mechanicalStructure": "required|important|optional|null",
   "modularity": "required|important|optional|null",
   "maintenance": "required|important|optional|null",
   "interfaces": "required|important|optional|null",
   "optionalEnhancements": "required|important|optional|null"
 }
}

Rules:
- Only extract information that is EXPLICITLY stated in the message
- If the message is vague, gibberish, or does not contain real product details, return all null values
- Extract brief descriptive examples for each feature when mentioned
- Classify importance: "required" = must have, "important" = should have, "optional" = nice to have
- Return null for features not mentioned
- Keep examples concise (under 15 words)
`;

  try {
    const response = await generatePremiumLLMResponse([
      { role: "system", content: "Return only valid JSON." },
      { role: "user", content: prompt }
    ]);

    const parsed = JSON.parse(response.trim());
    console.log("✅ LLM functional extraction:", parsed);
    return parsed;

  } catch (err) {
    console.warn("⚠️ LLM functional extraction failed, will use keyword fallback:", err.message);
    return null;
  }
}

/**
 * Semantic signal extraction - analyzes ANY answer for signal patterns
 * This runs BEFORE question-specific extraction to catch early insights
 */
async function extractSemanticSignals(sessionSignals, answer, questionId) {
  if (!sessionSignals || !answer) return;
  
  const text = answer.toLowerCase();
  ensureFunctionalSignals(sessionSignals);

  const materialKeywords = [
    "tpu", "abs", "pla", "petg", "pp", "pe", "pc", "pvc", "nylon", "silicone",
    "rubber", "aluminum", "aluminium", "steel", "stainless steel", "carbon fiber",
    "plastic", "metal", "glass"
  ];
  const detectedMaterials = materialKeywords.filter(mat => hasTerm(text, mat));
  if (detectedMaterials.length > 0) {
    sessionSignals.materialsKnowledge = "enough";
  }

  const quantityMatch = text.match(/(?:produce|production|batch|plan(?:ning)?(?:\s+to\s+produce)?|quantity|units?)\s*(?:of\s*)?(\d+[\d,\.]*)\s*(units|pcs|pieces)?/i)
    || text.match(/(\d+[\d,\.]*)\s*(units|pcs|pieces)/i);
  if (quantityMatch) {
    const qty = quantityMatch[1].replace(/,/g, "");
    sessionSignals.productionQuantity = `${qty} units`;
  }

  const manufacturingMap = [
    { key: "injection molding", value: "injection molding" },
    { key: "cnc", value: "CNC" },
    { key: "3d print", value: "3D printing" },
    { key: "3d printing", value: "3D printing" },
    { key: "die casting", value: "die casting" },
    { key: "sheet metal", value: "sheet metal" }
  ];
  const manufacturingDetected = manufacturingMap
    .filter(item => hasTerm(text, item.key))
    .map(item => item.value);
  if (manufacturingDetected.length > 0) {
    setSignal(sessionSignals, "manufacturingKnowledge", "enough");
  }

  const componentHints = ["wireless charging", "battery", "sensor", "pcb", "chip", "display", "usb", "bluetooth"];
  const detectedComponents = componentHints.filter(hint => hasTerm(text, hint));
  if (detectedComponents.length > 0) {
    sessionSignals.componentsKnowledge = "enough";
  }
  
  // ===== USER SIGNALS =====
  const userPatterns = [
    { keywords: ["elderly", "senior", "old people", "aged"], value: "elderly" },
    { keywords: ["children", "kids", "toddlers", "babies"], value: "children" },
    { keywords: ["athlete", "fitness", "gym", "sports"], value: "athletes" },
    { keywords: ["professional", "engineer", "doctor", "worker"], value: "professionals" },
    { keywords: ["consumer", "general public", "everyone"], value: "general" }
  ];
  
  for (const pattern of userPatterns) {
    if (pattern.keywords.some(kw => text.includes(kw))) {
      sessionSignals.users = pattern.value;
      sessionSignals.userUnderstanding = "enough";
      console.log(`🎯 Semantic extraction: users="${pattern.value}"`);
      break;
    }
  }
  
  // ===== PROBLEM CLARITY =====
  // If user describes a specific problem/solution, they understand the problem
  const problemIndicators = ["solve", "problem", "helps", "assists", "monitors", "tracks", "prevents"];
  if (problemIndicators.some(word => text.includes(word))) {
    sessionSignals.problemClarity = "enough";
    console.log(`🎯 Semantic extraction: problemClarity="enough"`);
  }
  
  // ===== ELECTRONICS =====
  // Only run if Q6 hasn't explicitly marked the product as non-electronic
  // Use hasTerm() for word-boundary matching to avoid false positives like "laptop screen" or "backpack" matching "app"
  if (sessionSignals.hasElectronics !== false) {
    const electronicsKeywords = ["sensor", "battery", "electronic", "bluetooth", "wifi", "display panel", "touchscreen", "microcontroller", "chip", "circuit"];
    if (electronicsKeywords.some(kw => hasTerm(text, kw))) {
      sessionSignals.electronicsKnowledge = "enough";
      sessionSignals.connectivity = true;
      console.log(`🎯 Semantic extraction: electronicsKnowledge="enough", connectivity=true`);
    }
  }
  
  // ===== DURABILITY =====
  const durabilityKeywords = ["outdoor", "rugged", "waterproof", "dustproof", "drop", "impact"];
  if (durabilityKeywords.some(kw => text.includes(kw))) {
    sessionSignals.durabilityNeed = true;
    sessionSignals.environment = text.includes("outdoor") ? "outdoor" : "both";
    
    // Extract durability target details
    if (text.includes("drop") || text.includes("protection")) {
      const dropMatch = text.match(/drop[s]?\s+(?:(?:up\s*to\s*|to\s*)?(\d+(?:\.\d+)?)\s*(?:m|meters|ft|feet))?/i);
      if (dropMatch && dropMatch[1]) {
        sessionSignals.durabilityTarget = `drop protection up to ${dropMatch[1]}m`;
      } else {
        sessionSignals.durabilityTarget = "drop protection";
      }
    }
    
    if ((text.includes("waterproof") || text.includes("water resistant")) &&
        !/\b(not|non)[- ]?(waterproof|water.resistant)/i.test(text)) {
      sessionSignals.durabilityTarget = sessionSignals.durabilityTarget 
        ? `${sessionSignals.durabilityTarget} and waterproof`
        : "waterproof";
    }
    
    if (sessionSignals.durabilityTarget) {
      sessionSignals.durabilityDefined = true;
      if (!sessionSignals.targetSpecClarity) {
        sessionSignals.targetSpecClarity = "enough";
      }
    }
    console.log(`🎯 Semantic extraction: durabilityTarget="${sessionSignals.durabilityTarget}", durabilityDefined=${sessionSignals.durabilityDefined}`);
  }
  
  // ===== SAFETY TARGETS =====
  const safetyKeywords = ["skin", "safe", "non-toxic", "non toxic", "poison", "allergic", "medical", "skin contact", "body contact"];
  if (safetyKeywords.some(kw => text.includes(kw))) {
    sessionSignals.safetyTarget = true;
    if (text.includes("skin") || text.includes("body contact")) {
      sessionSignals.safetyTarget = "skin-safe / non-toxic";
    } else if (text.includes("medical")) {
      sessionSignals.safetyTarget = "medical-grade / biocompatible";
    }
    if (sessionSignals.safetyTarget && sessionSignals.safetyTarget !== true) {
      sessionSignals.safetyDefined = true;
    }
    console.log(`🎯 Semantic extraction: safetyTarget="${sessionSignals.safetyTarget}", safetyDefined=${sessionSignals.safetyDefined}`);
  }
  
  // ===== COMPLIANCE TARGETS =====
  const complianceKeywords = ["ce", "iec", "fda", "rohs", "reach", "regulation", "standard", "export", "certif"];
  if (complianceKeywords.some(kw => hasTerm(text, kw))) {
    const standards = text.match(/\b(ce|iec|fda|rohs|reach)\b/gi);
    if (standards) {
      sessionSignals.complianceTarget = standards.join(" / ").toUpperCase();
    } else {
      sessionSignals.complianceTarget = "regulated / certified";
    }
    sessionSignals.complianceDefined = true;
    console.log(`🎯 Semantic extraction: complianceTarget="${sessionSignals.complianceTarget}", complianceDefined=${sessionSignals.complianceDefined}`);
  }
  
  // ===== WEIGHT TARGET =====
  // The dedicated weight question (whichever covers "weightTarget") is always authoritative - see its branch below.
  // Here we only do a preliminary capture from earlier answers so something is better than nothing.
  // Exclude "load testing up to X kg" and similar testing/capacity contexts.
  const weightMatch = text.match(/(?:under|less|below|max|up to)\s*([\d.]+)\s*(kg|grams?|g\b|lbs?|oz)/i);
  const isTestingContext = /(?:load|test|capacity|support|hold)[\w\s]*?(?:up\s+to|of)\s/i.test(text);
  if (weightMatch && !sessionSignals.weightTarget && questionId !== WEIGHT_QUESTION_ID && !isTestingContext) {
    sessionSignals.weightTarget = `${weightMatch[1]} ${weightMatch[2]}`;
    sessionSignals.weightDefined = true;
    console.log(`🎯 Semantic extraction: weightTarget="${sessionSignals.weightTarget}", weightDefined=${sessionSignals.weightDefined}`);
  }
  
  // ===== AESTHETIC TARGET =====
  // Avoid "design" as trigger - too generic (matches "designed for", "design process").
  // The specific aesthetic words below are sufficient triggers.
  const aestheticKeywords = ["look", "appearance", "aesthetic", "style", "color", "rugged", "slim", "premium", "modern", "minimalist", "industrial"];
  if (aestheticKeywords.some(kw => hasTerm(text, kw))) {
    const aesthetics = ["rugged", "slim", "premium", "modern", "industrial", "minimalist"];
    const detected = aesthetics.filter(a => text.includes(a));
    if (detected.length > 0) {
      // Only overwrite with specific words if we found something more precise
      // or if no string value has been established yet
      if (!sessionSignals.aestheticTarget || sessionSignals.aestheticTarget === true) {
        sessionSignals.aestheticTarget = `${detected.join(" / ")} design`;
      }
    } else {
      // Never downgrade a concrete string to the boolean placeholder
      if (!sessionSignals.aestheticTarget) {
        sessionSignals.aestheticTarget = true;
      }
    }
    if (sessionSignals.aestheticTarget && sessionSignals.aestheticTarget !== true) {
      sessionSignals.aestheticDefined = true;
    }
    console.log(`🎯 Semantic extraction: aestheticTarget="${sessionSignals.aestheticTarget}", aestheticDefined=${sessionSignals.aestheticDefined}`);
  }
  
  // ===== USAGE ENVIRONMENT =====
  if (text.includes("outdoor")) {
    sessionSignals.usageEnvironment = "outdoor";
  } else if (text.includes("indoor")) {
    sessionSignals.usageEnvironment = "indoor";
  } else if (text.includes("both") || text.includes("indoor and outdoor")) {
    sessionSignals.usageEnvironment = "indoor and outdoor";
  }
  if (sessionSignals.usageEnvironment) {
    console.log(`🎯 Semantic extraction: usageEnvironment="${sessionSignals.usageEnvironment}"`);
  }
  
  // ===== WEARABLE =====
  if (text.includes("wearable") || text.includes("watch") || text.includes("band") || text.includes("bracelet")) {
    sessionSignals.productPurpose = "wearable";
    sessionSignals.aestheticTarget = true;
    console.log(`🎯 Semantic extraction: productPurpose="wearable", aestheticTarget=true`);
  }

  // ===== FUNCTIONAL FEATURE IMPORTANCE =====
  const importance = classifyFeatureImportance(text);
  const featurePatterns = [
    { key: "coreFunctionality", keywords: ["primary", "core", "main function", "solve", "prevent", "protect"] },
    { key: "energyPower", keywords: ["battery", "power", "charging", "solar", "voltage", "wireless charging"] },
    { key: "controlLogic", keywords: ["control", "logic", "automatic", "automation", "sensor", "algorithm", "switch"] },
    { key: "userInteraction", keywords: ["button", "display panel", "touchscreen", "indicator", "touch input", "haptic feedback", "notification"] },
    { key: "environmentalProtection", keywords: ["waterproof", "dustproof", "outdoor", "weather", "temperature", "humidity"] },
    { key: "mechanicalStructure", keywords: ["mechanical", "structure", "enclosure", "frame", "mount", "impact", "drop"] },
    { key: "modularity", keywords: ["replaceable", "interchangeable", "modular", "swappable", "removable", "filter", "cartridge"] },
    { key: "maintenance", keywords: ["maintenance", "repair", "clean", "replace", "service", "tool-less", "easy to clean", "easy to service", "upkeep"] },
    { key: "interfaces", keywords: ["usb", "bluetooth", "wifi", "nfc", "api", "integration", "usb-c", "usb port", "data port", "connector port", "mobile app", "connectivity"] },
    { key: "optionalEnhancements", keywords: ["cloud", "ai", "smart feature", "ota update", "voice control", "gps tracking", "nice to have", "optional feature", "bonus feature"] }
  ];

  for (const feature of featurePatterns) {
    if (feature.keywords.some(keyword => text.includes(keyword))) {
      const featureImportance = feature.key === "optionalEnhancements" ? "optional" : importance;
      setFunctionalFeature(sessionSignals, feature.key, featureImportance);
    }
  }

  console.log("🎯 Functional feature extraction:", sessionSignals.functionalFeatures);

  // ===== FUNCTIONAL EXAMPLES - Descriptive feature statements =====
  ensureFunctionalExamples(sessionSignals);

  // ===== LLM-BASED FUNCTIONAL EXTRACTION (primary) =====
  const llmFunctionalSignals = await extractFunctionalSignals(answer);
  if (llmFunctionalSignals) {
    safeMergeSignals(sessionSignals, llmFunctionalSignals);
    console.log("📊 Merged LLM functional signals into session");
  }

  // Extract examples: Look for descriptive statements about product capabilities/features
  const examplePatterns = [
    // Core functionality: primary purpose, main function, solving a problem
    { 
      key: "coreFunctionality", 
      keywords: ["protect", "durable", "filter", "monitor", "track", "measure", "detect", "purify", "convert", "shockproof", "survive", "drop"],
      minLength: 10
    },
    // Energy/Power features
    { 
      key: "energyPower", 
      keywords: ["battery", "rechargeable", "solar", "powered", "charge", "power", "usb", "voltage"],
      minLength: 5
    },
    // Control logic
    { 
      key: "controlLogic", 
      keywords: ["automatic", "automated", "control", "logic", "sensor", "smart", "algorithm", "button", "switch"],
      minLength: 5
    },
    // User interaction
    { 
      key: "userInteraction", 
      keywords: ["led", "display", "screen", "button", "touch", "indicator", "notification", "feedback", "voice"],
      minLength: 5
    },
    // Environmental protection
    { 
      key: "environmentalProtection", 
      keywords: ["waterproof", "dustproof", "weather", "outdoor", "protected", "resistant", "sealed", "ip rating"],
      minLength: 5
    },
    // Mechanical structure
    { 
      key: "mechanicalStructure", 
      keywords: ["enclosure", "housing", "frame", "mount", "bracket", "drop", "impact", "shock", "mechanical", "structure"],
      minLength: 5
    },
    // Modularity
    { 
      key: "modularity", 
      keywords: ["replaceable", "interchangeable", "modular", "swappable", "upgrade", "changeable"],
      minLength: 5
    },
    // Maintenance
    {
      key: "maintenance",
      keywords: ["maintenance", "service", "repair", "clean", "replace", "tool-less", "upkeep", "cleaning", "replacement"],
      minLength: 5
    },
    // Interfaces
    {
      key: "interfaces",
      keywords: ["usb", "connector", "bluetooth", "wifi", "nfc", "api", "integration", "data port", "charging port"],
      minLength: 3
    },
    // Optional enhancements - must be clearly optional, not connectivity/interface keywords
    {
      key: "optionalEnhancements",
      keywords: ["optional", "bonus", "extra", "nice to have", "could include", "future", "upgrade", "ota", "voice", "gps"],
      minLength: 5
    }
  ];

  // Split answer into sentences for better context
  const sentences = answer.split(/(?<!\d)[.!?]+(?!\d)/).map(s => s.trim()).filter(s => s.length > 5);
  
  console.log(`📝 EXTRACTION DEBUG - Answer: "${answer.substring(0, 100)}..."`);
  console.log(`📝 Sentences split (${sentences.length} found):`, sentences);

  // ===== MULTI-FEATURE SENTENCE DETECTION =====
  for (const sentence of sentences) {
    const s = sentence.toLowerCase();

    // Energy / Power
    if (
      (s.includes("battery") || s.includes("charging") || s.includes("solar") || s.includes("powered by")) &&
      !sessionSignals.functionalExamples.energyPower
    ) {
      sessionSignals.functionalExamples.energyPower = sentence;
      console.log(`✅ QUICK MATCH: energyPower → "${sentence}"`);
    }

    // Control Logic
    if (
      (s.includes("sensor") || s.includes("automatic") || s.includes("algorithm")) &&
      !sessionSignals.functionalExamples.controlLogic
    ) {
      sessionSignals.functionalExamples.controlLogic = sentence;
      console.log(`✅ QUICK MATCH: controlLogic → "${sentence}"`);
    }

    // User Interaction
    if (
      (s.includes("led") || s.includes("display") || s.includes("button")) &&
      !sessionSignals.functionalExamples.userInteraction
    ) {
      sessionSignals.functionalExamples.userInteraction = sentence;
      console.log(`✅ QUICK MATCH: userInteraction → "${sentence}"`);
    }

    // Interfaces
    if (
      (s.includes("usb") || s.includes("bluetooth") || s.includes("wifi") || /\bport\b/.test(s)) &&
      !sessionSignals.functionalExamples.interfaces
    ) {
      sessionSignals.functionalExamples.interfaces = sentence;
      console.log(`✅ QUICK MATCH: interfaces → "${sentence}"`);
    }
  }

  // ===== EXAMPLE PATTERN SCORING =====
  // Only writes to empty slots - never overwrites existing examples.
  for (const pattern of examplePatterns) {
    if (sessionSignals.functionalExamples[pattern.key]) {
      continue; // already set - don't overwrite
    }

    let bestSentence = null;
    let bestScore = 0;

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      let score = 0;
      for (const kw of pattern.keywords) {
        if (sentenceLower.includes(kw)) score++;
      }
      if (score > bestScore && sentence.length >= pattern.minLength) {
        bestScore = score;
        bestSentence = sentence;
      }
    }

    if (bestSentence && bestScore > 0) {
      sessionSignals.functionalExamples[pattern.key] = bestSentence;
      console.log(`✅ BEST MATCH: ${pattern.key} → "${bestSentence}"`);
    }
  }
}

/**
 * Extract product signals from question-answer pair
 * Maps question IDs directly to signal updates
 *
 * @param {object} sessionSignals - Current user's session signals
 * @param {string} questionId - Question identifier (from signalQuestions.js)
 * @param {string} answer - User's answer text
 */
async function extractSignals(sessionSignals, questionId, answer) {
  if (!sessionSignals || !answer) return;

  const text = answer.toLowerCase();

  if (process.env.DEBUG_SIGNAL_PROMPT === "true") {
    console.log(buildSignalExtractionPrompt(answer));
  }

  // ===== LLM-BASED EXTRACTION (let the AI do its job) =====
  const extracted = await extractStructuredSignals(answer);
  if (extracted) {
    safeMergeSignals(sessionSignals, extracted);
  }

  const parsed = parseInlineJson(answer);
  if (parsed) {
    safeMergeSignals(sessionSignals, parsed);
  }

  // ===== SEMANTIC EXTRACTION (keyword + LLM fallback for ALL answers) =====
  await extractSemanticSignals(sessionSignals, answer, questionId);

  // ===== 29-QUESTION PRC FLOW (q1_product_and_users – q29_development_stage) =====

  // ─── SECTION 1: Product Identity & Context ────────────────────────────────

  if (questionId === "q1_product_and_users") {
    sessionSignals.productOverview = answer;
    // users and userUnderstanding filled by semantic extraction above
    // product and domain filled by extractProductSignals (called in prcEngine for Q1)
  }

  if (questionId === "q2_failure_modes") {
    const hasRisks = /fail|risk|break|fault|error|concern|hazard|issue|danger|leak|overheat|damage|incorrect|inaccurate/i.test(text);
    sessionSignals.failureModesKnowledge = hasRisks ? SIGNAL.ENOUGH : SIGNAL.PARTIAL;
    sessionSignals.riskAwareness = sessionSignals.failureModesKnowledge;
    if (!sessionSignals.safetyAwareness && hasRisks) {
      sessionSignals.safetyAwareness = SIGNAL.PARTIAL;
    }
  }

  if (questionId === "q3_patent_awareness") {
    if (/patent|prior art|existing product|similar product|competitor/i.test(text)) {
      sessionSignals.ipAwareness = SIGNAL.ENOUGH;
    } else if (/no patent|not aware|don't know|unsure|no idea/i.test(text)) {
      sessionSignals.ipAwareness = SIGNAL.UNKNOWN;
    } else {
      sessionSignals.ipAwareness = SIGNAL.PARTIAL;
    }
  }

  // ─── SECTION 2: Technical Fundamentals ────────────────────────────────────

  if (questionId === "q4_core_functionality") {
    sessionSignals.coreFunctionalityKnowledge = answer;
    // Core functionality is inherently required - override any semantic classification
    setFunctionalFeature(sessionSignals, "coreFunctionality", "required");
    ensureFunctionalExamples(sessionSignals);
    if (!sessionSignals.functionalExamples.coreFunctionality) {
      sessionSignals.functionalExamples.coreFunctionality = answer.slice(0, 120);
    }
    // Describing core purpose also signals problem clarity
    if (!sessionSignals.problemClarity) {
      sessionSignals.problemClarity = SIGNAL.ENOUGH;
    }
  }

  if (questionId === "q5_science_principles") {
    // A substantive technical description signals "enough" regardless of binary yes/no words
    const hasTechContent =
      /principl|physics|engineer|relies|biosensor|technolog|ble\b|bluetooth|wi.?fi|wireless|microcontroller|algorithm|circuit|mechanic|electronic|sensor|optic|chemical|material|force|energy/i.test(text);
    const hasSubstance = answer.trim().length > 60;
    sessionSignals.scienceClarity =
      hasTechContent || hasSubstance ? SIGNAL.ENOUGH : interpretBinary(answer);
  }

  // ─── SECTION 3: Electronics & Connectivity ────────────────────────────────

  if (questionId === "q6_electronics_power") {
    setSignal(sessionSignals, "electronicsKnowledge", answer);
    if (/\bno\b|\bnone\b|not.*electronic|manual only|purely mechanical/i.test(text)) {
      sessionSignals.powerSource = "manual";
      sessionSignals.hasElectronics = false;
      // Override any electronics signals set by semantic extraction on earlier answers
      sessionSignals.electronicsKnowledge = SIGNAL.UNKNOWN;
      sessionSignals.connectivity = false;
    } else {
      sessionSignals.hasElectronics = true;
      if (/battery/i.test(text)) sessionSignals.powerSource = "battery";
      else if (/solar/i.test(text)) sessionSignals.powerSource = "solar";
      else if (/plug|wall|mains|wired/i.test(text)) sessionSignals.powerSource = "mains";
      else if (/manual|no power|mechanical/i.test(text)) sessionSignals.powerSource = "manual";
    }
    // Only track energyPower when electronics are actually present
    if (sessionSignals.hasElectronics !== false) {
      setFunctionalFeature(sessionSignals, "energyPower", classifyFeatureImportance(text) || "important");
      ensureFunctionalExamples(sessionSignals);
      if (!sessionSignals.functionalExamples.energyPower) {
        sessionSignals.functionalExamples.energyPower = answer.slice(0, 120);
      }
    } else {
      // Mark as explicitly "no electronics" - use marker values that won't be overwritten
      // by later LLM extractions (null/empty would be treated as "empty slot")
      ensureFunctionalSignals(sessionSignals);
      sessionSignals.functionalFeatures.energyPower = "__none__";
      sessionSignals.functionalFeatures.controlLogic = "__none__";
      ensureFunctionalExamples(sessionSignals);
      sessionSignals.functionalExamples.energyPower = "__none__";
      sessionSignals.functionalExamples.controlLogic = "__none__";
      sessionSignals.functionalExamples.interfaces = "__none__";
    }
  }

  if (questionId === "q28_optional_features") {
    if (/app|bluetooth|wifi|nfc|wireless|connected|internet/i.test(text)) {
      sessionSignals.connectivity = true;
      setFunctionalFeature(sessionSignals, "interfaces", classifyFeatureImportance(text) || "important");
      ensureFunctionalExamples(sessionSignals);
      if (!sessionSignals.functionalExamples.interfaces) {
        sessionSignals.functionalExamples.interfaces = answer.slice(0, 120);
      }
    } else if (/\bno\b|not.*connect|standalone|offline/i.test(text)) {
      sessionSignals.connectivity = false;
    }
  }

  if (questionId === "q8_user_interaction") {
    setFunctionalFeature(sessionSignals, "userInteraction", classifyFeatureImportance(text) || "required");
    ensureFunctionalExamples(sessionSignals);
    // Always set from the dedicated interaction question - overrides any LLM guess from earlier answers
    sessionSignals.functionalExamples.userInteraction = answer.slice(0, 120);
    // Control logic inferred if sensors/automation mentioned
    if (/sensor|automat|algorithm|logic|detect/i.test(text)) {
      setFunctionalFeature(sessionSignals, "controlLogic", classifyFeatureImportance(text) || "important");
      if (!sessionSignals.functionalExamples.controlLogic) {
        sessionSignals.functionalExamples.controlLogic = answer.slice(0, 120);
      }
    }
  }

  // ─── SECTION 4: Physical Design ───────────────────────────────────────────

  if (questionId === WEIGHT_QUESTION_ID) {
    // Weight question is always authoritative - overwrite any weight captured from earlier answers
    const q9WeightMatch = text.match(/(?:under|less|below|max|up to)\s*([\d.]+)\s*(kg|grams?|g\b|lbs?|oz)/i);
    if (q9WeightMatch) {
      sessionSignals.weightTarget = `${q9WeightMatch[1]} ${q9WeightMatch[2]}`;
    } else {
      sessionSignals.weightTarget = answer;
    }
    sessionSignals.weightDefined = true;
    setFunctionalFeature(sessionSignals, "mechanicalStructure", classifyFeatureImportance(text) || "important");
    ensureFunctionalExamples(sessionSignals);
    if (!sessionSignals.functionalExamples.mechanicalStructure) {
      sessionSignals.functionalExamples.mechanicalStructure = answer.slice(0, 120);
    }
    if (!sessionSignals.targetSpecClarity) {
      sessionSignals.targetSpecClarity = SIGNAL.ENOUGH;
    }
  }

  if (questionId === "q10_durability") {
    const notWaterproof = /\b(not|non)[- ]?(waterproof|water.resistant)/i.test(text);
    const hasDrop = /\bdrop|impact|scratch|durable|rugged/i.test(text);

    // Strip waterproof from any prior semantic durabilityTarget if user says not waterproof
    if (notWaterproof && sessionSignals.durabilityTarget) {
      sessionSignals.durabilityTarget = sessionSignals.durabilityTarget
        .replace(/\s*and\s*waterproof/i, "")
        .replace(/waterproof\s*and\s*/i, "")
        .replace(/^waterproof$/i, "")
        .trim() || null;
    }

    if (hasDrop) {
      sessionSignals.durabilityNeed = true;
      if (!sessionSignals.durabilityTarget) sessionSignals.durabilityTarget = answer;
      sessionSignals.durabilityDefined = true;
      setFunctionalFeature(sessionSignals, "environmentalProtection", classifyFeatureImportance(text) || "important");
      ensureFunctionalExamples(sessionSignals);
      if (!sessionSignals.functionalExamples.environmentalProtection) {
        sessionSignals.functionalExamples.environmentalProtection = answer.slice(0, 120);
      }
    } else if (!hasDrop && /\bno\b|not.*rugged|indoor only/i.test(text)) {
      sessionSignals.durabilityNeed = false;
    }
  }

  if (questionId === "q11_materials") {
    sessionSignals.materialsKnowledge = /not.*sure|don't know|unsure|tbd|unknown/i.test(text)
      ? SIGNAL.UNKNOWN
      : SIGNAL.ENOUGH;
  }

  if (questionId === "q12_aesthetics") {
    if (!sessionSignals.aestheticTarget || sessionSignals.aestheticTarget === true) {
      sessionSignals.aestheticTarget = answer;
    }
    sessionSignals.aestheticDefined = true;
  }

  if (questionId === "q13_usage_environment") {
    if (/both|indoor.*outdoor|outdoor.*indoor/i.test(text)) {
      sessionSignals.usageEnvironment = "indoor and outdoor";
      sessionSignals.environment = "both";
    } else if (/outdoor/i.test(text)) {
      sessionSignals.usageEnvironment = "outdoor";
      sessionSignals.environment = "outdoor";
    } else if (/indoor/i.test(text)) {
      sessionSignals.usageEnvironment = "indoor";
      sessionSignals.environment = "indoor";
    } else {
      sessionSignals.usageEnvironment = answer;
    }
  }

  if (questionId === "q14_housing_structure") {
    // Asks about housing material and how parts are held together
    sessionSignals.componentsKnowledge = /not.*sure|don't know|unsure|tbd/i.test(text)
      ? SIGNAL.UNKNOWN
      : SIGNAL.ENOUGH;
    setFunctionalFeature(sessionSignals, "mechanicalStructure", classifyFeatureImportance(text) || "important");
    ensureFunctionalExamples(sessionSignals);
    // Always overwrite - this is the dedicated question, earlier LLM guesses may be wrong
    sessionSignals.functionalExamples.mechanicalStructure = answer.slice(0, 120);
    // Infer assembly approach from housing description if not already captured
    if (!sessionSignals.assemblyApproach && /snap|screw|clip|weld|adhere|press.?fit/i.test(text)) {
      sessionSignals.assemblyApproach = answer;
    }
  }

  // ─── SECTION 5: Manufacturing ─────────────────────────────────────────────

  if (questionId === "q15_parts_strategy") {
    sessionSignals.otsVsCustomParts = answer;
  }

  if (questionId === "q16_prototype_testing") {
    setSignal(sessionSignals, "designClarity", answer);
    setSignal(sessionSignals, "testingStatus", answer);
    if (/3d print|breadboard|cnc|prototype|mock.?up|model|built|fabricat/i.test(text)) {
      sessionSignals.prototypeStatus = "exists";
      sessionSignals.prototypeMethod = answer;
    } else if (/not yet|haven't|no prototype|not built|concept only/i.test(text)) {
      sessionSignals.prototypeStatus = "not started";
    } else {
      sessionSignals.prototypeStatus = interpretBinary(answer) === SIGNAL.ENOUGH ? "exists" : "not started";
    }
  }

  if (questionId === "q17_manufacturing_process") {
    sessionSignals.manufacturingKnowledge = /injection|cnc|3d print|machining|casting|pcb|assembly|molding|stamping/i.test(text)
      ? SIGNAL.ENOUGH
      : SIGNAL.PARTIAL;
    sessionSignals.manufacturingClarity = sessionSignals.manufacturingKnowledge === SIGNAL.ENOUGH;
    sessionSignals.manufacturingProcess = answer;
    setFunctionalFeature(sessionSignals, "mechanicalStructure", classifyFeatureImportance(text) || "required");
  }

  if (questionId === "q18_tolerances") {
    sessionSignals.toleranceFitKnowledge = /toleran|fit|clearance|dimension|precision|tight|\+\/\-|mm|micron/i.test(text)
      ? SIGNAL.ENOUGH
      : SIGNAL.PARTIAL;
    sessionSignals.tolerancesConsidered = answer;
  }

  if (questionId === "q19_assembly") {
    sessionSignals.assemblyApproach = answer;
    ensureFunctionalExamples(sessionSignals);
    if (!sessionSignals.functionalExamples.maintenance) {
      if (/tool.?less|simple|snap|clip/i.test(text)) {
        sessionSignals.functionalExamples.maintenance = answer.slice(0, 80);
      }
    }
  }

  // ─── SECTION 6: Safety & Compliance ──────────────────────────────────────

  if (questionId === "q20_safety") {
    // Content-based detection: describing ANY specific risk means the user is aware of safety
    // Using interpretBinary here is wrong - words like "non-toxic" contain "not" → UNKNOWN
    const hasRiskContent = /risk|hazard|danger|toxic|sharp|electric|skin|allergen|burn|cut|leak|chemical|poisonous|biohazard|radiation/i.test(text);
    const noRisksClaimed = /no risk|no hazard|no safety|none|safe product|completely safe/i.test(text);
    sessionSignals.safetyAwareness = (!noRisksClaimed && (hasRiskContent || answer.trim().length > 30))
      ? SIGNAL.ENOUGH
      : SIGNAL.PARTIAL;
    if (!sessionSignals.safetyTarget) {
      sessionSignals.safetyTarget = noRisksClaimed ? false : answer;
    }
    if (sessionSignals.safetyTarget && sessionSignals.safetyTarget !== false) {
      sessionSignals.safetyDefined = true;
    }
  }

  if (questionId === "q21_compliance") {
    setSignal(sessionSignals, "complianceAwareness", answer);
    if (!sessionSignals.complianceTarget) {
      sessionSignals.complianceTarget = /\bno\b|none|not.*regulat|not.*certif/i.test(text) ? false : answer;
    }
    if (sessionSignals.complianceTarget && sessionSignals.complianceTarget !== false) {
      sessionSignals.complianceDefined = true;
    }
  }

  // ─── SECTION 7: Business & Scale ──────────────────────────────────────────

  if (questionId === "q22_unit_cost") {
    sessionSignals.costEconomicsKnowledge = /\$|cost|price|budget|unit|estimate|\d+/i.test(text)
      ? SIGNAL.ENOUGH
      : SIGNAL.PARTIAL;
    sessionSignals.costAwareness = sessionSignals.costEconomicsKnowledge === SIGNAL.ENOUGH;
    if (!sessionSignals.costEstimate) sessionSignals.costEstimate = answer;
  }

  if (questionId === "q23_production_volume") {
    sessionSignals.scalabilityKnowledge = /\d+|hundred|thousand|million|batch|volume/i.test(text)
      ? SIGNAL.ENOUGH
      : SIGNAL.PARTIAL;
    if (!sessionSignals.productionQuantity) sessionSignals.productionQuantity = answer;
  }

  if (questionId === "q24_supply_chain") {
    sessionSignals.supplyChainKnowledge = /supplier|vendor|source|buy|partner|supply|manufacturer|factory/i.test(text)
      ? SIGNAL.ENOUGH
      : SIGNAL.PARTIAL;
  }

  // ─── SECTION 8: Product Completeness ─────────────────────────────────────

  if (questionId === "q25_replaceable_parts") {
    const modularImportance = /\bno\b|none|not replaceable|not.*replac/i.test(text) ? "optional" : "important";
    setFunctionalFeature(sessionSignals, "modularity", modularImportance);
    ensureFunctionalExamples(sessionSignals);
    // Always overwrite - this is the dedicated question, earlier LLM guesses may be wrong
    sessionSignals.functionalExamples.modularity = answer.slice(0, 120);
  }

  if (questionId === "q26_critical_parts") {
    sessionSignals.criticalPartsKnowledge = answer;
    // If components were unknown, promote to enough since user is naming critical parts
    if (!sessionSignals.componentsKnowledge || sessionSignals.componentsKnowledge === SIGNAL.UNKNOWN) {
      sessionSignals.componentsKnowledge = SIGNAL.ENOUGH;
    }
  }

  if (questionId === "q27_maintenance") {
    const maintImportance = /\bno\b|none|no maintenance|maintenance.?free/i.test(text) ? "optional" : "important";
    setFunctionalFeature(sessionSignals, "maintenance", maintImportance);
    ensureFunctionalExamples(sessionSignals);
    // Always set from the dedicated maintenance question - overrides any LLM guess from earlier answers
    sessionSignals.functionalExamples.maintenance = answer.slice(0, 120);
  }

  if (questionId === "q28_optional_features") {
    setFunctionalFeature(sessionSignals, "optionalEnhancements", "optional");
    ensureFunctionalExamples(sessionSignals);
    // Always overwrite - this is the dedicated question, earlier LLM guesses may be wrong
    sessionSignals.functionalExamples.optionalEnhancements = answer.slice(0, 120);
  }

  // ─── SECTION 9: Development Plan ──────────────────────────────────────────

  if (questionId === "q29_development_stage") {
    if (/production.?ready|launched|shipping/i.test(text)) {
      sessionSignals.developmentPlan = SIGNAL.ENOUGH;
      sessionSignals.designClarity = SIGNAL.ENOUGH;
    } else if (/pilot|tested prototype|validated/i.test(text)) {
      sessionSignals.developmentPlan = SIGNAL.ENOUGH;
      if (!sessionSignals.designClarity) sessionSignals.designClarity = SIGNAL.ENOUGH;
    } else if (/prototype/i.test(text)) {
      sessionSignals.developmentPlan = SIGNAL.PARTIAL;
      if (!sessionSignals.designClarity) sessionSignals.designClarity = SIGNAL.PARTIAL;
    } else {
      sessionSignals.developmentPlan = SIGNAL.PARTIAL;
    }
    // Listed milestones mean they have a plan
    if (/milestone|next step|plan|launch|target/i.test(text)) {
      sessionSignals.developmentPlan = SIGNAL.ENOUGH;
    }
  }

  console.log(`📊 Signal extracted from ${questionId}:`, sessionSignals);
}

module.exports = extractSignals;
module.exports.extractProductSignals = extractProductSignals;
module.exports.interpretBinary = interpretBinary;
