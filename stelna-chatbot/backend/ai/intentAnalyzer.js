const llmService = require("../services/llmService");

async function validateAnswer(question, answer) {
  const normalizedAnswer = (answer || "").toLowerCase().trim();
  const permissiveShortAnswers = new Set([
    "yes",
    "no",
    "maybe",
    "not sure",
    "unsure",
    "don't know",
    "dont know",
    "i don't know",
    "i dont know"
  ]);

  if (permissiveShortAnswers.has(normalizedAnswer)) {
    return "VALID";
  }

  if (!answer || answer.length < 3) {
    return "INVALID";
  }

  try {
    const prompt = `
You are validating a user's answer in a product development conversation.

Question:
${question}

User answer:
${answer}

Determine if the answer addresses the question.

Respond with ONLY one word:

VALID
PARTIAL
INVALID
`;

    const response = await llmService.generateLLMResponse(prompt);

    if (response.includes("VALID")) return "VALID";
    if (response.includes("PARTIAL")) return "PARTIAL";

    return "INVALID";
  } catch (error) {
    // If LLM fails (rate limit, network, etc.), use fallback validation
    console.log(`⚠️  LLM validation failed: ${error.message}, using fallback...`);
    return fallbackValidation(question, answer);
  }
}

/**
 * Fallback validation when LLM is unavailable
 * Simple heuristic: more than 5 words = likely valid
 */
function fallbackValidation(question, answer) {
  const wordCount = answer.trim().split(/\s+/).length;
  
  // Short answers (1-2 words) like "yes", "no", "maybe" are valid for simple questions
  if (wordCount <= 2) {
    const shortAnswers = ["yes", "no", "maybe", "yes i do", "no i don't", "not yet"];
    if (shortAnswers.some(sa => answer.toLowerCase().includes(sa))) {
      return "VALID";
    }
  }
  
  // Medium+ answers are generally valid for open-ended questions
  if (wordCount >= 3) {
    return "VALID";
  }
  
  return "INVALID";
}

function normalize(text) {
  return (text || "").toLowerCase().trim();
}

async function detectIntent(message, questionId) {
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

/**
 * SIGNAL-BASED VALIDATION
 * Extract signals from user answer and check relevance
 * If signals are found → answer is valid
 * If signals are missing → ask follow-up
 */

/**
 * Extract signals relevant to the question
 */
function extractSignalsForQuestion(text, questionId) {
  const signals = {};

  // Q1: Product Overview
  if (questionId === 'q1_product') {
    if (/product|solution|app|device|tool|system|software|hardware|service|bottle|tracking|smart|makes|build|created|develops/i.test(text)) {
      signals.product = true;
    }
    if (/problem|solve|help|address|issue|pain|need|challenge|goal/i.test(text)) {
      signals.problem = true;
    }
    if (/user|customer|people|who|target|audience|buyer/i.test(text)) {
      signals.user = true;
    }
    if (/market|industry|domain|segment|space|category|sector/i.test(text)) {
      signals.market = true;
    }
  }

  // Q2: Development Timeline
  else if (questionId === 'q2_roadmap') {
    if (/timeline|roadmap|phase|stage|schedule|plan|milestone|goal|deadline|target/i.test(text)) {
      signals.timeline = true;
    }
    if (/month|week|quarter|year|spring|summer|fall|winter|q[1-4]|\d+\s*month/i.test(text)) {
      signals.timeframe = true;
    }
    if (/launch|release|ship|deploy|go live|production|market/i.test(text)) {
      signals.milestone = true;
    }
    if (/prototype|beta|alpha|mvp/i.test(text)) {
      signals.stage = true;
    }
  }

  // Q3: Design Clarity
  else if (questionId === 'q3_design') {
    if (/design|sketch|prototype|cad|model|drawing|mockup|wireframe|concept/i.test(text)) {
      signals.design = true;
    }
    if (/solidworks|autocad|fusion|sketch|3d print|render|blueprint/i.test(text)) {
      signals.toolsUsed = true;
    }
    if (/form|shape|size|dimension|aesthetic|appearance|look/i.test(text)) {
      signals.appearance = true;
    }
    if (/functional|structure|mechanism|how.*works/i.test(text)) {
      signals.functional = true;
    }
  }

  // Q4: How It Works
  else if (questionId === 'q4_function') {
    if (/function|work|operate|does|process|flow|mechanism|how/i.test(text)) {
      signals.functionality = true;
    }
    if (/sensor|measure|detect|input|receive|read/i.test(text)) {
      signals.sensors = true;
    }
    if (/output|send|communicate|transmit|display|control|actuate/i.test(text)) {
      signals.outputs = true;
    }
    if (/electronics|circuit|software|code|logic|algorithm|controller/i.test(text)) {
      signals.control = true;
    }
  }

  // Q5: Materials & Manufacturing
  else if (questionId === 'q5_materials') {
    if (/material|plastic|metal|aluminum|steel|rubber|glass|wood|composite/i.test(text)) {
      signals.material = true;
    }
    if (/injection|molding|cnc|machining|3d print|casting|forging|assembly/i.test(text)) {
      signals.manufacturing = true;
    }
    if (/supplier|vendor|sourcing|supply chain|buy|vendor/i.test(text)) {
      signals.sourcing = true;
    }
  }

  // Q6: Compliance & Standards
  else if (questionId === 'q6_compliance') {
    if (/standard|certification|ce|fcc|iso|rohs|regulatory|compliance|requirement/i.test(text)) {
      signals.standards = true;
    }
    if (/safety|risk|hazard|uls|etl|tuv|approval|test/i.test(text)) {
      signals.safety = true;
    }
    if (/food|medical|electrical|directive|law|regulation/i.test(text)) {
      signals.domain = true;
    }
  }

  // Q7: Testing
  else if (questionId === 'q7_testing') {
    if (/test|validate|verify|trial|experiment|eval|check|inspect/i.test(text)) {
      signals.testing = true;
    }
    if (/user test|usability|feedback|prototype|real world|field/i.test(text)) {
      signals.userTest = true;
    }
    if (/durability|stress|load|performance|reliability|quality/i.test(text)) {
      signals.durability = true;
    }
  }

  // Q8: Safety
  else if (questionId === 'q8_safety') {
    if (/safety|risk|hazard|danger|fail|break|accident|poison|burn|shock/i.test(text)) {
      signals.safetyAware = true;
    }
    if (/mitigation|prevent|protect|guard|shield|precaution/i.test(text)) {
      signals.mitigation = true;
    }
  }

  // Q9: Electronics
  else if (questionId === 'q9_electronics') {
    if (/electronics|circuit|sensor|battery|power|voltage|current|led|bluetooth|wifi|gsm/i.test(text)) {
      signals.electronics = true;
    }
    if (/microcontroller|arduino|raspberry|stm|arm|chip|processor/i.test(text)) {
      signals.processor = true;
    }
    if (/communication|wireless|antenna|protocol|zigbee|mqtt|can/i.test(text)) {
      signals.communication = true;
    }
  }

  // Q10: Components
  else if (questionId === 'q10_components') {
    if (/component|part|module|assembly|subsystem|unit|piece/i.test(text)) {
      signals.components = true;
    }
    if (/list|bom|detailed|specific/i.test(text)) {
      signals.documented = true;
    }
  }

  console.log(`[SIGNALS] Q${questionId}: Extracted signals:`, Object.keys(signals).filter(k => signals[k]));
  return signals;
}

/**
 * PROGRESSIVE SIGNAL COLLECTION - Accept if primary signals found, ask for missing secondary signals
 * Don't reject - instead ask for missing information via follow-ups
 */

/**
 * Define primary (must-have) and secondary (nice-to-have) signals per question
 */
function getSignalDefinitions(questionId) {
  const definitions = {
    'q1_product': {
      primary: ['product'],        // Must mention the product/solution itself
      secondary: ['problem', 'user', 'market']  // Nice to also mention user/problem/domain
    },
    'q2_roadmap': {
      primary: ['timeline', 'timeframe', 'milestone', 'stage'],  // Any timeline indicator is good
      secondary: ['milestone', 'stage']
    },
    'q3_design': {
      primary: ['design'],         // Must mention design/prototypes
      secondary: ['toolsUsed', 'appearance', 'functional']
    },
    'q4_function': {
      primary: ['functionality', 'sensors', 'outputs'],  // How it works
      secondary: ['control']
    },
    'q5_materials': {
      primary: ['material'],       // Must mention materials
      secondary: ['manufacturing', 'sourcing']
    },
    'q6_compliance': {
      primary: ['standards', 'safety', 'domain'],  // Safety/compliance awareness
      secondary: []
    },
    'q7_testing': {
      primary: ['testing'],        // Must mention testing
      secondary: ['userTest', 'durability']
    },
    'q8_safety': {
      primary: ['safetyAware'],    // Safety awareness
      secondary: ['mitigation']
    },
    'q9_electronics': {
      primary: ['electronics'],    // Electronics mentioned
      secondary: ['processor', 'communication']
    },
    'q10_components': {
      primary: ['components'],     // Must mention components
      secondary: ['documented']
    }
  };
  
  return definitions[questionId] || { primary: [], secondary: [] };
}

/**
 * Check if answer has primary signals (acceptance threshold)
 */
function hasRelevantSignals(signals, questionId) {
  const def = getSignalDefinitions(questionId);
  const signalKeys = Object.keys(signals).filter(k => signals[k]);
  
  // Check if ANY primary signal is found
  const hasPrimarySignal = def.primary.some(p => signals[p]);
  
  if (!hasPrimarySignal) {
    console.log(`[VALIDATION] Q${questionId}: No primary signals found → REJECT`);
    return false;
  }

  console.log(`[VALIDATION] Q${questionId}: Found primary signal(s) → ACCEPT`);
  return true;
}

/**
 * Identify which secondary signals are missing (for follow-ups)
 */
function getMissingSignals(signals, questionId) {
  const def = getSignalDefinitions(questionId);
  const signalKeys = Object.keys(signals).filter(k => signals[k]);
  
  // Find missing secondary signals
  const missing = def.secondary.filter(s => !signals[s]);
  
  console.log(`[SIGNALS] Q${questionId}: Missing signals:`, missing.length > 0 ? missing : 'none');
  return missing;
}

/**
 * Generate conversational follow-up questions for missing signals
 */
function generateFollowUpQuestion(questionId, signals, extractedSignals) {
  // Map of missing signals to conversational follow-ups
  const followUpPrompts = {
    'q1_product': {
      problem: "What problem does it solve for them? What pain point or challenge are you addressing?",
      user: "Who is the main user or customer for this product?",
      market: "What market or industry does this belong to?"
    },
    'q2_roadmap': {
      milestone: "When do you plan to reach each milestone? (prototype → testing → production → launch)",
      stage: "What stage are you currently in? (prototype, beta, MVP, etc.)"
    },
    'q3_design': {
      toolsUsed: "What tools did you use to create the design? (CAD software, sketches, etc.)",
      appearance: "Can you describe the appearance or form factor?",
      functional: "How does the structure support its functionality?"
    },
    'q4_function': {
      control: "Will it have any electronics, software, or control logic?"
    },
    'q5_materials': {
      manufacturing: "How do you plan to manufacture it?",
      sourcing: "Where will you source the materials?"
    },
    'q7_testing': {
      userTest: "Have you tested it with actual users or in real-world conditions?",
      durability: "How will you test durability and reliability?"
    },
    'q8_safety': {
      mitigation: "What steps will you take to prevent or mitigate these risks?"
    },
    'q9_electronics': {
      processor: "What processor or microcontroller will you use?",
      communication: "How will it communicate? (WiFi, Bluetooth, cellular, etc.)"
    },
    'q10_components': {
      documented: "Do you have a detailed component list or BOM?"
    }
  };
  
  const missing = getMissingSignals(signals, questionId);
  
  if (missing.length === 0) {
    return null;  // No follow-ups needed
  }
  
  // Get first missing signal and its follow-up prompt
  const firstMissing = missing[0];
  const prompts = followUpPrompts[questionId] || {};
  const followUp = prompts[firstMissing];
  
  return followUp || null;
}

/**
 * Build acknowledgment message with follow-up
 */
function buildProgressiveResponse(questionId, message, signals, extractedSignals) {
  // Create diverse acknowledgments based on question
  const acknowledgments = {
    'q1_product': [
      "Great — I see that you're working on",
      "Nice — that sounds like",
      "Got it — so you have",
      "Perfect — a",
      "Interesting — you're building"
    ],
    'q2_roadmap': [
      "Perfect — you're planning for",
      "Great — that timeline makes sense:",
      "Got it — so your roadmap includes",
      "Nice — you're targeting",
      "Good — you have dates in mind:"
    ],
    'q3_design': [
      "Excellent — you've done",
      "Great — you have",
      "Perfect — your design includes",
      "Nice — you've created",
      "Good — you have design work:"
    ],
    'q4_function': [
      "Got it — so your product",
      "Perfect — the core function is",
      "Great — it works by",
      "Understood — the mechanism involves",
      "Good — your product"
    ],
    'q5_materials': [
      "Perfect — so you're using",
      "Great — you've selected",
      "Good choice —",
      "Understood — the materials are",
      "Nice — you've thought about"
    ],
    'q6_compliance': [
      "Good — you're aware of",
      "Important — you understand",
      "Great — you've identified",
      "Understood — compliance-wise",
      "Perfect — you know about"
    ],
    'q7_testing': [
      "Excellent — your testing plan includes",
      "Good — you'll validate through",
      "Perfect — you're planning to test",
      "Great — your validation approach is",
      "Understood — you'll check via"
    ],
    'q8_safety': [
      "Important — you've identified",
      "Good — you're aware of",
      "Perfect — safety factors include",
      "Understood — the risks are",
      "Good thinking — the hazards are"
    ],
    'q9_electronics': [
      "Great — your electronics include",
      "Good — you'll use",
      "Perfect — the tech stack is",
      "Understood — you have",
      "Nice — your components are"
    ],
    'q10_components': [
      "Good — your main parts are",
      "Great — the component list includes",
      "Perfect — you've identified",
      "Understood — your BOM includes",
      "Good — you have"
    ]
  };
  
  const acks = acknowledgments[questionId] || ["Got it —"];
  const randomAck = acks[Math.floor(Math.random() * acks.length)];
  
  const followUp = generateFollowUpQuestion(questionId, signals, extractedSignals);
  
  if (followUp) {
    return `${randomAck} ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}\n\n${followUp}`;
  } else {
    return `${randomAck} ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`;
  }
}

/**
 * LLM-ASSISTED VALIDATION
 * When fast signal check is unclear, ask LLM if answer addresses the question
 */

const questionTextMap = {
  "q1_product": "What's your product? What problem are you solving? Who is the user? What domain does it belong to?",
  "q2_roadmap": "Do you have a product development roadmap in mind? What's your timeline for prototype → testing → production → launch?",
  "q3_design": "Have you done concept sketches? Created prototypes? Do you have any design artifacts?",
  "q4_function": "What's the primary function of the product? What are the science and technology principles involved?",
  "q5_materials": "What materials and manufacturing processes are suitable for your product?",
  "q6_compliance": "Are you aware of government regulations, international standards, or compliances for this product category?",
  "q7_testing": "How do you test and validate the product? What validation methods do you plan to use?",
  "q8_safety": "What are the safety factors and risks involved with the product?",
  "q9_electronics": "What electronics, sensors, or electrical components does the product need?",
  "q10_components": "What are the main parts and components that make up the product?",
  "q11_support": "What kind of support or expertise do you need to move forward?",
  "q12_timeline": "What's your realistic timeline for getting this product to market?"
};

async function validateWithLLM(text, questionId) {
  try {
    const { generateLLMResponse } = require('../services/llmService');

    const questionText = questionTextMap[questionId] || "Does this answer make sense?";
    
    const prompt = `You are validating a user's answer to a product development question.

Question: ${questionText}

User answer: "${text}"

Does the user's answer reasonably address the question? 

Respond with ONLY one word:
VALID
or
INVALID`;

    const response = await generateLLMResponse([
      {
        role: "user",
        content: prompt
      }
    ]);

    const isValid = response.toUpperCase().includes("VALID");
    console.log(`  [LLM] Response: ${response.trim()} → ${isValid ? '✓ VALID' : '✗ INVALID'}`);
    return isValid;
  } catch (err) {
    console.log(`  [LLM] Error: ${err.message} → Assuming INVALID`);
    return false;
  }
}

module.exports = {
  validateAnswer,
  detectIntent
};
