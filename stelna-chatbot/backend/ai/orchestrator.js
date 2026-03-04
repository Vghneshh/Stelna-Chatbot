const { validateAnswer } = require("./intentAnalyzer");
const { extractProduct } = require("./productBrain/signalExtractor");

/**
 * Handle Q1: What product are you building?
 */
async function handleQ1(answer, signals) {
  const validation = await validateAnswer(
    "What product are you building?",
    answer
  );

  if (validation === "INVALID") {
    return {
      message: "Could you briefly describe the product you're building?"
    };
  }

  const product = await extractProduct(answer);

  signals.set("product", product);

  return {
    message: `Nice — a ${product}.\n\nWhat problem does it solve for users?`
  };
}

/**
 * Handle Q2: What problem does it solve?
 */
async function handleQ2(answer, signals) {
  const validation = await validateAnswer(
    "What problem does it solve?",
    answer
  );

  if (validation === "INVALID") {
    return {
      message: "Could you tell us what problem this product addresses?"
    };
  }

  signals.set("problem", answer);

  return {
    message: `Got it.\n\nWho would mainly use this product?`
  };
}

/**
 * Handle Q3: Who is the user?
 */
async function handleQ3(answer, signals) {
  const validation = await validateAnswer(
    "Who is the main user of this product?",
    answer
  );

  if (validation === "INVALID") {
    return {
      message: "Could you describe who the main user or customer is?"
    };
  }

  signals.set("user", answer);

  return {
    message: `Perfect.\n\nHave you done any design work yet? (sketches, prototypes, CAD files, etc.)`
  };
}

function runHybridDecision() {
  // Future implementation
}

module.exports = {
  handleQ1,
  handleQ2,
  handleQ3,
  runHybridDecision
};
