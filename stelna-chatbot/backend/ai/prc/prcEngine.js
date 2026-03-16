const prcQuestions = require("./prcQuestions");
const extractSignals = require("../productBrain/signalExtractor");
const { extractProductSignals } = require("../productBrain/signalExtractor");
const { generateLLMResponse } = require("../../services/llmService");
const {
  buildFunctionalRequirements
} = require("../productBrain/functionalRequirementsBuilder");
const {
  hydrateNonFunctionalFromSignals,
  ensureNonFunctionalRequirements
} = require("../productBrain/nonFunctionalRequirementsBuilder");
const {
  hydrateManufacturingFromSignals,
  ensureManufacturingReadiness
} = require("../productBrain/manufacturingReadinessBuilder");
const {
  buildKnowledgeReadiness
} = require("../productBrain/knowledgeReadinessBuilder");
const {
  startPRCSession,
  getPRCSession,
  savePRCSession,
  deletePRCSession
} = require("../../memory/sessionManager");

function shouldTriggerPRC(message) {
  return String(message || "").toLowerCase().includes("check product readiness");
}

function getStageMetaByIndex(index) {
  const question = prcQuestions[index];
  if (!question) return null;

  const stage = question.stage || "knowledge";
  const stageOrder = [...new Set(prcQuestions.map((q) => q.stage || "knowledge"))];
  const stageQuestions = prcQuestions.filter((q) => (q.stage || "knowledge") === stage);

  const stageNumber = stageOrder.indexOf(stage) + 1;
  const stageQuestionNum = prcQuestions
    .slice(0, index + 1)
    .filter((q) => (q.stage || "knowledge") === stage).length;

  return {
    stage,
    stageNumber,
    stageQuestionNum,
    stageQuestionTotal: stageQuestions.length
  };
}

// Quick regex fallback to catch obvious gibberish when LLM is unavailable
function isObviousGibberish(text) {
  const t = (text || "").trim().toLowerCase();
  // Single character
  if (t.length <= 1) return true;
  // Only 2-3 chars and not a real word (allow: ok, no, ya, yes, idk, na, hi)
  const shortValid = ["ok", "no", "na", "ya", "ye", "yes", "hi", "idk", "yep", "nah", "nop", "yea"];
  if (t.length <= 3 && !shortValid.includes(t) && !/^\d+$/.test(t)) return true;
  // Mix of random letters and numbers with no vowels (e.g., "5g4h", "rgw", "t4g")
  if (t.length <= 5 && !/[aeiou]/i.test(t) && /\d/.test(t)) return true;
  // Repeated same character (e.g., "gg", "kk", "rrr")
  if (/^(.)\1+$/.test(t)) return true;
  return false;
}

// Detect conversational/meta messages that aren't actual answers
function isClarificationRequest(text) {
  const t = (text || "").trim().toLowerCase();
  const patterns = [
    /repeat/i, /explain/i, /what do you mean/i, /don'?t understand/i,
    /didn'?t get/i, /didn'?t catch/i, /can you clarify/i, /more detail/i,
    /what'?s that/i, /huh\??/i, /come again/i, /say that again/i,
    /rephrase/i, /what\??$/i, /i don'?t know what/i, /confused/i,
    /help me understand/i, /elaborate/i, /wdym/i, /wym/i
  ];
  return patterns.some(p => p.test(t));
}

async function isGibberish(message, question) {
  try {
    const prompt = [
      {
        role: "system",
        content: `You are an NLP input validator. Given a question and the user's answer, classify the answer as "valid", "gibberish", or "clarification".

- "valid" — The answer attempts to address the question, even if it is short, has typos, or is vague. Answers like "no idea", "not sure", "don't know", "haven't decided" are valid — the user is saying they lack that information. When in doubt, choose valid.
- "gibberish" — The answer is random characters (e.g. "asdf", "hgjk"), key mashing, or has absolutely zero relevance to the question (e.g. "lol", "haha" for a product question).
- "clarification" — The user is asking to repeat or rephrase the question.

Respond with ONLY one word.`
      },
      {
        role: "user",
        content: `Question: "${question}"\nAnswer: "${message}"`
      }
    ];
    const result = await generateLLMResponse(prompt);
    const response = result.trim().toLowerCase();
    if (response.includes("clarification")) return "clarification";
    if (response.includes("gibberish")) return "gibberish";
    return "valid";
  } catch (err) {
    console.warn("⚠️ Gibberish LLM check failed, using fallback regex:", err.message);
    if (isClarificationRequest(message)) return "clarification";
    if (isObviousGibberish(message)) return "gibberish";
    return "valid";
  }
}

async function startPRC(sessionKey) {
  await startPRCSession(sessionKey);
  return {
    question: prcQuestions[0],
    totalQuestions: prcQuestions.length,
    stageMeta: getStageMetaByIndex(0)
  };
}

async function nextQuestion(sessionKey, message) {
  const state = await getPRCSession(sessionKey);
  if (!state) {
    return null;
  }

  const currentIndex = state.currentQuestion;
  const currentQuestion = prcQuestions[currentIndex];

  if (!state.answers || typeof state.answers !== "object") {
    state.answers = {};
  }

  // Check for gibberish or clarification requests using LLM
  const questionText = currentQuestion?.question || currentQuestion?.text || "";
  const inputCheck = await isGibberish(message, questionText);

  if (inputCheck === "gibberish") {
    return {
      done: false,
      botMessage: "I didn't quite catch that. Could you please provide a meaningful answer?",
      questionNum: currentIndex + 1,
      totalQuestions: prcQuestions.length,
      stageMeta: getStageMetaByIndex(currentIndex),
      question: currentQuestion,
      isRetry: true
    };
  }

  if (inputCheck === "clarification") {
    const hint = currentQuestion.hint || "";
    const rephrased = hint
      ? `Sure! Here's what I mean:\n\n${hint}\n\nTake your best shot — even a rough answer helps!`
      : `No worries! In simpler words — ${questionText}\n\nIf you're unsure, just say "not sure" and we'll move on.`;
    return {
      done: false,
      botMessage: rephrased,
      questionNum: currentIndex + 1,
      totalQuestions: prcQuestions.length,
      stageMeta: getStageMetaByIndex(currentIndex),
      question: currentQuestion,
      isRetry: true
    };
  }

  if (currentQuestion?.id) {
    state.answers[currentQuestion.id] = message;

    if (!state.sessionSignals || typeof state.sessionSignals !== "object") {
      state.sessionSignals = {};
    }

    await extractSignals(state.sessionSignals, currentQuestion.id, message).catch(err => {
      console.warn("⚠️ Signal extraction failed for question", currentQuestion.id, "—", err.message);
    });
  }

  let botMessage = "Got it! 👍";

  // Detect "I don't know" type answers and give a helpful acknowledgement
  const dontKnowPattern = /\b(no idea|not sure|don'?t know|dont know|haven'?t decided|no clue|unsure|idk|dunno|skip|haven'?t thought|never thought)\b/i;
  if (dontKnowPattern.test(message)) {
    botMessage = "No worries — that's totally fine! We'll mark this as undecided for now. You can always revisit it later.";
  }
  if (currentIndex === 0) {
    const extracted = await extractProductSignals(message).catch(err => {
      console.warn("⚠️ Product signal extraction failed —", err.message);
      return { product: "", user: "", problem: "", domain: "", hasElectronics: false };
    });
    state.productSignals = extracted;
    if (extracted.product) state.productName = extracted.product;
    if (extracted.user) state.userSegment = extracted.user;
    if (extracted.problem) state.problemStatement = extracted.problem;
    if (extracted.domain) state.productDomain = extracted.domain;

    console.log("📊 Extracted product signals from Q1:", extracted);

    let ack = "Got it";
    if (extracted.product) {
      ack = `Nice - a ${extracted.product}`;
    }
    if (extracted.user) {
      ack += ` for ${extracted.user}`;
    }
    ack += ".";
    botMessage = ack;
  }

  state.currentQuestion += 1;

  if (state.currentQuestion >= prcQuestions.length) {
    const completedAnswers = state.answers;

    if (!state.sessionSignals || typeof state.sessionSignals !== "object") {
      state.sessionSignals = {};
    }
    hydrateNonFunctionalFromSignals(state.sessionSignals);
    ensureNonFunctionalRequirements(state.sessionSignals);
    hydrateManufacturingFromSignals(state.sessionSignals);
    ensureManufacturingReadiness(state.sessionSignals);

    const knowledgeReadiness = buildKnowledgeReadiness(state.sessionSignals);

    const functionalRequirements = buildFunctionalRequirements(
      state.sessionSignals,
      completedAnswers
    );

    // Build non-functional requirements array for frontend
    const nonFunctionalRequirements = [];
    if (state.sessionSignals.nonFunctional) {
      const nf = state.sessionSignals.nonFunctional;
      const categories = ["weight", "durability", "safety", "compliance", "aesthetics", "usageEnvironment"];
      categories.forEach((cat) => {
        const data = nf[cat] || {};
        nonFunctionalRequirements.push({
          category: cat.charAt(0).toUpperCase() + cat.slice(1),
          target: data.target || "--",
          defined: data.defined ? "Yes" : "No",
          validated: data.validated ? "Yes" : "No",
          risk: data.risk || "Unknown"
        });
      });
    }

    // Build manufacturing readiness array for frontend
    const manufacturingReadiness = [];
    if (state.sessionSignals.manufacturing) {
      const mfg = state.sessionSignals.manufacturing;
      const aspects = [
        "manufacturingProcess",
        "materialIdentified",
        "prototypeMethod",
        "tolerances",
        "assemblyApproach",
        "criticalParts",
        "otsVsCustom",
        "roughCost",
        "feasibility"
      ];
      aspects.forEach((asp) => {
        const data = mfg[asp] || {};
        manufacturingReadiness.push({
          aspect: asp.charAt(0).toUpperCase() + asp.slice(1),
          status: data.status ? "Yes" : "No",
          vendor: data.vendor ? "Yes" : "No",
          cost: data.cost ? "Yes" : "No",
          confidence: data.confidence || 0
        });
      });
    }

    await deletePRCSession(sessionKey);
    
    // Debug logging - always see structures before sending
    console.log("🎯 PRC RESULT", {
      knowledgeReadiness: knowledgeReadiness?.length || 0,
      functionalRequirements: functionalRequirements?.length || 0,
      nonFunctionalRequirements: nonFunctionalRequirements?.length || 0,
      manufacturingReadiness: manufacturingReadiness?.length || 0
    });
    
    return {
      done: true,
      totalQuestions: prcQuestions.length,
      answers: completedAnswers,
      productSignals: state.productSignals || {},
      knowledgeReadiness: knowledgeReadiness || [],
      functionalRequirements: functionalRequirements || [],
      nonFunctionalRequirements: nonFunctionalRequirements || [],
      manufacturingReadiness: manufacturingReadiness || []
    };
  }

  await savePRCSession(sessionKey, state);

  // Build partial PRC data from signals so far (on a cloned copy to avoid mutation)
  const partialData = buildPartialPRC(state.sessionSignals, state.answers, state.currentQuestion);

  return {
    done: false,
    botMessage,
    questionNum: state.currentQuestion + 1,
    totalQuestions: prcQuestions.length,
    stageMeta: getStageMetaByIndex(state.currentQuestion),
    question: prcQuestions[state.currentQuestion],
    knowledgeReadiness: partialData.knowledgeReadiness,
    functionalRequirements: partialData.functionalRequirements,
    nonFunctionalRequirements: partialData.nonFunctionalRequirements,
    manufacturingReadiness: partialData.manufacturingReadiness
  };
}

// Build partial PRC data from current signals (uses a deep clone to avoid mutation)
// NOTE: Does NOT call ensure* functions — only includes fields with real signals, no defaults.
// Only DISPLAYS functional rows whose dedicated question has already been answered.
function buildPartialPRC(sessionSignals, answers, currentQuestionIndex) {
  const snapshot = JSON.parse(JSON.stringify(sessionSignals || {}));

  const knowledgeReadiness = buildKnowledgeReadiness(snapshot);

  const functionalRequirements = buildFunctionalRequirements(snapshot, answers || {}, { partial: true });

  // Map each functional row (by array index) to its dedicated question ID.
  // A row is only shown if that question has been answered (its index < currentQuestionIndex).
  const FUNCTIONAL_ROW_QUESTION = {
    0: "q4_core_functionality",     // Core Functionality
    1: "q6_electronics_power",      // Energy / Power
    2: "q6_electronics_power",      // Control & Logic (answered when electronics question is reached)
    3: "q8_user_interaction",       // User Interaction
    4: "q10_durability",            // Environmental Protection
    5: "q14_housing_structure",     // Mechanical Structure
    6: "q25_replaceable_parts",     // Modularity
    7: "q27_maintenance",           // Maintenance
    8: null,                        // Interfaces (no dedicated question — show when ANY data exists)
    9: "q28_optional_features"      // Optional Enhancements
  };

  // Build a set of question IDs that have been answered (index < currentQuestionIndex)
  const answeredQuestions = new Set();
  for (let i = 0; i < currentQuestionIndex; i++) {
    if (prcQuestions[i]) answeredQuestions.add(prcQuestions[i].id);
  }

  const partialFunctional = functionalRequirements.map((row, idx) => {
    const dedicatedQ = FUNCTIONAL_ROW_QUESTION[idx];

    // If there's a dedicated question and it hasn't been answered yet, hide this row
    if (dedicatedQ && !answeredQuestions.has(dedicatedQ)) {
      return null;
    }

    // For rows with no dedicated question (interfaces), show only if there's real data
    if (!dedicatedQ) {
      const hasExample = row.example && row.example !== "";
      const hasFeatureData = row.mustHave !== "--" || (row.featureType !== "--" && row.featureType !== "");
      if (!hasExample && !hasFeatureData) return null;
    }

    return row;
  });

  // Only hydrate (move flat signals to nested structure) — do NOT fill defaults
  hydrateNonFunctionalFromSignals(snapshot);
  const nonFunctionalRequirements = [];

  // Map NF categories to their dedicated question IDs
  const NF_CATEGORY_QUESTION = {
    weight: "q9_size_weight",
    durability: "q10_durability",
    safety: "q20_safety",
    compliance: "q21_compliance",
    aesthetics: "q12_aesthetics",
    usageEnvironment: "q13_usage_environment"
  };

  if (snapshot.nonFunctional) {
    const nf = snapshot.nonFunctional;
    const categories = ["weight", "durability", "safety", "compliance", "aesthetics", "usageEnvironment"];
    categories.forEach((cat) => {
      // Only show NF row if its dedicated question has been answered
      const dedicatedQ = NF_CATEGORY_QUESTION[cat];
      if (dedicatedQ && !answeredQuestions.has(dedicatedQ)) return;

      const data = nf[cat];
      if (!data) return;
      nonFunctionalRequirements.push({
        category: cat.charAt(0).toUpperCase() + cat.slice(1),
        target: data.target || "--",
        defined: data.defined ? "Yes" : "No",
        validated: data.validated ? "Yes" : "No",
        risk: data.risk || "Unknown"
      });
    });
  }

  // Only hydrate — do NOT fill defaults
  hydrateManufacturingFromSignals(snapshot);
  const manufacturingReadiness = [];

  // Map manufacturing aspects to their dedicated question IDs
  const MFG_ASPECT_QUESTION = {
    manufacturingProcess: "q17_manufacturing_process",
    materialIdentified: "q11_materials",
    prototypeMethod: "q16_prototype_testing",
    tolerances: "q18_tolerances",
    assemblyApproach: "q19_assembly",
    criticalParts: "q26_critical_parts",
    otsVsCustom: "q15_parts_strategy",
    roughCost: "q22_unit_cost",
    feasibility: "q17_manufacturing_process"
  };

  if (snapshot.manufacturing) {
    const mfg = snapshot.manufacturing;
    const aspects = [
      "manufacturingProcess", "materialIdentified", "prototypeMethod",
      "tolerances", "assemblyApproach", "criticalParts",
      "otsVsCustom", "roughCost", "feasibility"
    ];
    aspects.forEach((asp) => {
      // Only show manufacturing row if its dedicated question has been answered
      const dedicatedQ = MFG_ASPECT_QUESTION[asp];
      if (dedicatedQ && !answeredQuestions.has(dedicatedQ)) return;

      const data = mfg[asp];
      if (!data) return;
      manufacturingReadiness.push({
        aspect: asp.charAt(0).toUpperCase() + asp.slice(1),
        status: data.status ? "Yes" : "No",
        vendor: data.vendor ? "Yes" : "No",
        cost: data.cost ? "Yes" : "No",
        confidence: data.confidence || 0
      });
    });
  }

  return { knowledgeReadiness, functionalRequirements: partialFunctional, nonFunctionalRequirements, manufacturingReadiness };
}

module.exports = {
  shouldTriggerPRC,
  startPRC,
  nextQuestion
};