/**
 * Signal Extractor
 * Listens to chatbot answers and updates session signals
 */

const { generateLLMResponse } = require("../../services/llmService");

/**
 * Extract core product signals (product, user, problem, domain) from first answer
 * This is used for Q1 to intelligently extract all product metadata at once
 */
async function extractProductSignals(answer) {
  const prompt = `
Extract structured product signals from the user's message.

User message:
"${answer}"

Return ONLY valid JSON with these fields if present:

{
  "product": "",
  "user": "",
  "problem": "",
  "domain": ""
}

Rules:
- product = the main product/device being built (be specific: "smart water bottle", not just "device")
- user = target user/customer (elderly people, athletes, students, etc.)
- problem = the problem it solves (hydration reminder, performance tracking, etc.)
- domain = product category (IoT, medical, wearable, consumer electronics, health, smart home, etc.)

Be concise. If a field is not mentioned, set it to empty string "".
Return ONLY the JSON object, no other text.
`;

  try {
    const response = await generateLLMResponse([
      { role: "system", content: "You extract structured product signals. Return only valid JSON." },
      { role: "user", content: prompt }
    ]);

    // Clean response - remove markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleanedResponse);
    
    console.log("🔍 Product signal extraction result:", parsed);
    return parsed;
  } catch (err) {
    console.error("❌ Product signal extraction failed:", err.message);
    return { product: "", user: "", problem: "", domain: "" };
  }
}

/**
 * Convert binary yes/no/maybe answers to signal values
 */
function interpretBinary(answer) {
  const text = (answer || "").toLowerCase();

  if (text.includes("yes") || text.includes("have") || text.includes("do")) {
    return "enough";
  }
  if (text.includes("no") || text.includes("not yet") || text.includes("not")) {
    return "unknown";
  }
  if (text.includes("maybe") || text.includes("think") || text.includes("partially")) {
    return "partial";
  }

  return "partial";
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

  Object.assign(sessionSignals, parsed);

  if (parsed.functionalExamples && typeof parsed.functionalExamples === "object") {
    ensureFunctionalExamples(sessionSignals);
    sessionSignals.functionalExamples = {
      ...sessionSignals.functionalExamples,
      ...parsed.functionalExamples
    };
  }

  if (parsed.functionalFeatures && typeof parsed.functionalFeatures === "object") {
    ensureFunctionalSignals(sessionSignals);
    sessionSignals.functionalFeatures = {
      ...sessionSignals.functionalFeatures,
      ...parsed.functionalFeatures
    };
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
    const response = await generateLLMResponse([
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
  const requiredCues = ["must have", "must", "needs to", "need to", "should", "primary function", "essential", "critical"];
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
 * Semantic signal extraction - analyzes ANY answer for signal patterns
 * This runs BEFORE question-specific extraction to catch early insights
 */
function extractSemanticSignals(sessionSignals, answer) {
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
    sessionSignals.materialsKnowledge = [...new Set(detectedMaterials)].join(", ");
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
    sessionSignals.manufacturingKnowledge = [...new Set(manufacturingDetected)].join(", ");
  }

  const componentHints = ["wireless charging", "battery", "sensor", "pcb", "chip", "display", "usb", "bluetooth"];
  const detectedComponents = componentHints.filter(hint => hasTerm(text, hint));
  if (detectedComponents.length > 0) {
    sessionSignals.componentsKnowledge = [...new Set(detectedComponents)].join(", ");
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
  const electronicsKeywords = ["sensor", "battery", "smart", "electronic", "app", "bluetooth", "wifi", "screen", "display", "chip"];
  if (electronicsKeywords.some(kw => text.includes(kw))) {
    sessionSignals.electronicsKnowledge = "enough";
    sessionSignals.connectivity = true;
    console.log(`🎯 Semantic extraction: electronicsKnowledge="enough", connectivity=true`);
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
    
    if (text.includes("waterproof") || text.includes("water resistant")) {
      sessionSignals.durabilityTarget = sessionSignals.durabilityTarget 
        ? `${sessionSignals.durabilityTarget} and waterproof`
        : "waterproof";
    }
    
    if (sessionSignals.durabilityTarget) {
      sessionSignals.durabilityDefined = true;
      if (!sessionSignals.targetSpecClarity) {
        sessionSignals.targetSpecClarity = sessionSignals.durabilityTarget;
      }
    }
    console.log(`🎯 Semantic extraction: durabilityTarget="${sessionSignals.durabilityTarget}", durabilityDefined=${sessionSignals.durabilityDefined}`);
  }
  
  // ===== SAFETY TARGETS =====
  const safetyKeywords = ["skin", "safe", "non-toxic", "non toxic", "poison", "allergic", "medical", "contact"];
  if (safetyKeywords.some(kw => text.includes(kw))) {
    sessionSignals.safetyTarget = true;
    if (text.includes("skin")) {
      sessionSignals.safetyTarget = "skin-safe / non-toxic";
    } else if (text.includes("medical") || text.includes("contact")) {
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
  const weightMatch = text.match(/(?:under|less|below|max|up to)\s*([\d.]+)\s*(kg|g|lbs?|oz)/i);
  if (weightMatch) {
    sessionSignals.weightTarget = `${weightMatch[1]} ${weightMatch[2]}`;
    sessionSignals.weightDefined = true;
    console.log(`🎯 Semantic extraction: weightTarget="${sessionSignals.weightTarget}", weightDefined=${sessionSignals.weightDefined}`);
  }
  
  // ===== AESTHETIC TARGET =====
  const aestheticKeywords = ["design", "look", "appearance", "aesthetic", "style", "color", "rugged", "slim", "premium", "modern"];
  if (aestheticKeywords.some(kw => text.includes(kw))) {
    const aesthetics = ["rugged", "slim", "premium", "modern", "industrial", "minimalist"];
    const detected = aesthetics.filter(a => text.includes(a));
    if (detected.length > 0) {
      sessionSignals.aestheticTarget = `${detected.join(" / ")} design`;
    } else {
      sessionSignals.aestheticTarget = true;
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
    { key: "userInteraction", keywords: ["button", "display", "screen", "indicator", "touch", "feedback", "notification"] },
    { key: "environmentalProtection", keywords: ["waterproof", "dustproof", "outdoor", "weather", "temperature", "humidity"] },
    { key: "mechanicalStructure", keywords: ["mechanical", "structure", "enclosure", "frame", "mount", "impact", "drop"] },
    { key: "modularity", keywords: ["modular", "replaceable", "interchangeable", "upgrade", "swappable"] },
    { key: "maintenance", keywords: ["maintenance", "service", "repair", "clean", "replace", "tool-less"] },
    { key: "interfaces", keywords: ["usb", "bluetooth", "wifi", "nfc", "api", "integration", "port"] },
    { key: "optionalEnhancements", keywords: ["nice to have", "optional", "add-on", "addon", "extra", "bonus"] }
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

  // Extract examples: Look for descriptive statements about product capabilities/features
  const examplePatterns = [
    // Core functionality: primary purpose, main function, solving a problem
    { 
      key: "coreFunctionality", 
      keywords: ["protect", "durable", "filter", "monitor", "track", "measure", "detect", "purify", "convert", "make", "build", "design", "create", "product", "shockproof", "survive", "drop"],
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
      keywords: ["maintenance", "service", "repair", "clean", "replace", "tool-less", "easy", "access"],
      minLength: 5
    },
    // Interfaces
    { 
      key: "interfaces", 
      keywords: ["usb", "port", "connector", "bluetooth", "wifi", "nfc", "api", "integration", "charging"],
      minLength: 3
    },
    // Optional enhancements
    { 
      key: "optionalEnhancements", 
      keywords: ["app", "mobile", "connectivity", "cloud", "sync", "bonus", "optional", "extra"],
      minLength: 5
    }
  ];

  // Split answer into sentences for better context
  const sentences = answer.split(/(?<!\d)[.!?]+(?!\d)/).map(s => s.trim()).filter(s => s.length > 5);
  
  console.log(`📝 EXTRACTION DEBUG - Answer: "${answer.substring(0, 100)}..."`);
  console.log(`📝 Sentences split (${sentences.length} found):`, sentences);
  
  for (const pattern of examplePatterns) {
    // Only extract if we haven't already set an example for this feature
    if (sessionSignals.functionalExamples[pattern.key]) {
      console.log(`📝 Skipping ${pattern.key} - already set`);
      continue;
    }
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      
      // Check if sentence contains relevant keywords
      const hasKeyword = pattern.keywords.some(kw => sentenceLower.includes(kw));
      
      if (hasKeyword && sentence.length >= pattern.minLength) {
        // Prefer longer, more descriptive sentences
        sessionSignals.functionalExamples[pattern.key] = sentence;
        console.log(`✅ EXTRACTED: ${pattern.key} = "${sentence.substring(0, 100)}"`);
        break; // Move to next pattern
      }
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

  const extracted = await extractStructuredSignals(answer);
  if (extracted) {
    safeMergeSignals(sessionSignals, extracted);
  }

  const parsed = parseInlineJson(answer);
  if (parsed) {
    safeMergeSignals(sessionSignals, parsed);
  }
  
  // ===== STEP 1: SEMANTIC EXTRACTION (runs for ALL answers) =====
  // DISABLED: Specs-driven capture for future implementation
  // extractSemanticSignals(sessionSignals, answer);

  // ===== SIMPLE ANSWER STORAGE (plain Q&A mode) =====
  // Store answers by question ID for the 12-question PRC flow

  if (questionId === "q1_product") {
    sessionSignals.productOverview = answer;
  }

  if (questionId === "q2_roadmap") {
    sessionSignals.developmentPlan = interpretBinary(answer);
  }

  if (questionId === "q3_design") {
    sessionSignals.designClarity = interpretBinary(answer);
  }

  if (questionId === "q4_function") {
    sessionSignals.scienceClarity = interpretBinary(answer);
  }

  if (questionId === "q5_materials") {
    sessionSignals.materialsKnowledge = answer;
  }

  if (questionId === "q6_compliance") {
    sessionSignals.complianceAwareness = answer;
  }

  if (questionId === "q7_testing") {
    sessionSignals.testingStatus = answer;
  }

  if (questionId === "q8_safety") {
    sessionSignals.safetyAwareness = interpretBinary(answer);
  }

  if (questionId === "q9_electronics") {
    sessionSignals.electronicsKnowledge = interpretBinary(answer);
  }

  if (questionId === "q10_components") {
    sessionSignals.componentsKnowledge = answer;
  }

  if (questionId === "q11_support") {
    sessionSignals.supportNeeded = answer;
  }

  if (questionId === "q12_specs") {
    sessionSignals.targetSpecClarity = answer;
  }

  // ===== KNOWLEDGE READINESS =====
  if (questionId === "problem") {
    sessionSignals.problemClarity = interpretBinary(answer);
  }

  if (questionId === "users") {
    sessionSignals.userUnderstanding = interpretBinary(answer);
  }

  if (questionId === "roadmap") {
    sessionSignals.developmentPlan = interpretBinary(answer);
  }

  if (questionId === "design") {
    sessionSignals.designClarity = interpretBinary(answer);
  }

  if (questionId === "science") {
    sessionSignals.scienceClarity = interpretBinary(answer);
  }

  if (questionId === "materials_knowledge") {
    sessionSignals.materialsKnowledge = interpretBinary(answer);
  }

  if (questionId === "manufacturing_knowledge") {
    sessionSignals.manufacturingKnowledge = interpretBinary(answer);
  }

  if (questionId === "electronics") {
    sessionSignals.electronicsKnowledge = interpretBinary(answer);
  }

  if (questionId === "components") {
    if (!sessionSignals.componentsKnowledge || sessionSignals.componentsKnowledge === "unknown") {
      sessionSignals.componentsKnowledge = interpretBinary(answer);
    }
  }

  if (questionId === "safety_knowledge") {
    sessionSignals.safetyAwareness = interpretBinary(answer);
  }

  if (questionId === "testing_knowledge") {
    sessionSignals.testingStatus = interpretBinary(answer);
  }

  if (questionId === "target_specs") {
    sessionSignals.targetSpecClarity = interpretBinary(answer);
  }

  // ===== ENVIRONMENT & DURABILITY =====
  if (questionId === "product_use") {
    if (text.includes("outdoor")) {
      sessionSignals.environment = "outdoor";
      sessionSignals.durabilityNeed = true;
    } else if (text.includes("indoor")) {
      sessionSignals.environment = "indoor";
    } else if (text.includes("both")) {
      sessionSignals.environment = "both";
      sessionSignals.durabilityNeed = true;
    }
  }

  if (questionId === "durability_need") {
    if (text.includes("yes") || text.includes("drop") || text.includes("water")) {
      sessionSignals.durabilityNeed = true;
    } else {
      sessionSignals.durabilityNeed = false;
    }
  }

  // ===== POWER SOURCE =====
  if (questionId === "power_source") {
    if (text.includes("battery")) {
      sessionSignals.powerSource = "battery";
    } else if (text.includes("solar")) {
      sessionSignals.powerSource = "solar";
    } else if (text.includes("plug") || text.includes("wall") || text.includes("mains")) {
      sessionSignals.powerSource = "mains";
    } else if (text.includes("manual")) {
      sessionSignals.powerSource = "manual";
    }
  }

  // ===== CONNECTIVITY =====
  if (questionId === "connectivity") {
    if (text.includes("app") || text.includes("bluetooth") || text.includes("wifi") || text.includes("wireless") || text.includes("connected")) {
      sessionSignals.connectivity = true;
    } else if (text.includes("no")) {
      sessionSignals.connectivity = false;
    }
  }

  // ===== MATERIAL CLARITY =====
  if (questionId === "materials") {
    if (text.includes("not") || text.includes("yet") || text.includes("don't know")) {
      sessionSignals.materialClarity = "unknown";
    } else if (text.includes("plastic") || text.includes("metal") || text.includes("wood") || text.includes("composite")) {
      sessionSignals.materialClarity = "known";
    } else {
      sessionSignals.materialClarity = "partial";
    }
  }

  // ===== MANUFACTURING CLARITY =====
  if (questionId === "manufacturing") {
    if (text.includes("yes") || text.includes("injection") || text.includes("3d") || text.includes("cnc")) {
      sessionSignals.manufacturingClarity = true;
    } else if (text.includes("no") || text.includes("not")) {
      sessionSignals.manufacturingClarity = false;
    }
  }

  // ===== COST AWARENESS =====
  if (questionId === "cost") {
    if (text.includes("yes") || text.includes("estimate") || text.includes("budget") || text.includes("rough")) {
      sessionSignals.costAwareness = true;
    } else {
      sessionSignals.costAwareness = false;
    }
  }

  // ===== PROTOTYPE STATUS =====
  if (questionId === "prototype") {
    if (text.includes("yes") || text.includes("built") || text.includes("made")) {
      sessionSignals.prototypeStatus = "exists";
    } else {
      sessionSignals.prototypeStatus = "not started";
    }
  }

  // ===== NON-FUNCTIONAL TARGETS =====
  if (questionId === "weight_goal") {
    sessionSignals.weightTarget = answer;
  }

  if (questionId === "durability_goal") {
    if (text.includes("yes") || text.includes("water") || text.includes("drop") || text.includes("rough")) {
      sessionSignals.durabilityTarget = true;
    } else {
      sessionSignals.durabilityTarget = false;
    }
  }

  if (questionId === "safety_goal") {
    if (text.includes("skin") || text.includes("people") || text.includes("contact") || text.includes("touch")) {
      sessionSignals.safetyTarget = true;
    } else {
      sessionSignals.safetyTarget = false;
    }
  }

  if (questionId === "compliance_goal") {
    if (text.includes("yes") || text.includes("regulated") || text.includes("export")) {
      sessionSignals.complianceTarget = true;
    } else {
      sessionSignals.complianceTarget = false;
    }
  }

  if (questionId === "aesthetic_goal") {
    if (text.includes("yes") || text.includes("important") || text.includes("design")) {
      sessionSignals.aestheticTarget = true;
    } else {
      sessionSignals.aestheticTarget = false;
    }
  }

  // ===== USAGE ENVIRONMENT =====
  if (questionId === "product_use" || questionId === "environment") {
    if (text.includes("outdoor")) {
      sessionSignals.usageEnvironment = "outdoor";
    } else if (text.includes("indoor")) {
      sessionSignals.usageEnvironment = "indoor";
    } else if (text.includes("both")) {
      sessionSignals.usageEnvironment = "indoor and outdoor";
    }
  }

  console.log(`📊 Signal extracted from ${questionId}:`, sessionSignals);
}

module.exports = extractSignals;
module.exports.extractProductSignals = extractProductSignals;
module.exports.interpretBinary = interpretBinary;
