const prcQuestions = require("./prcQuestions");
const extractSignals = require("../productBrain/signalExtractor");
const { extractProductSignals } = require("../productBrain/signalExtractor");
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

  return {
    done: false,
    botMessage,
    questionNum: state.currentQuestion + 1,
    totalQuestions: prcQuestions.length,
    stageMeta: getStageMetaByIndex(state.currentQuestion),
    question: prcQuestions[state.currentQuestion]
  };
}

module.exports = {
  shouldTriggerPRC,
  startPRC,
  nextQuestion
};