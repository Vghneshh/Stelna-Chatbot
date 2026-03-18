function buildKnowledgeReadiness(signals) {
  const rows = [];

  function level(value) {
    if (value === "enough") return "Know Enough";
    if (value === "partial") return "Know Partially";
    return "--";
  }

  function needHelp(value) {
    if (value === "enough") return "FALSE";
    if (value === "partial") return "TRUE";
    return "--";
  }

  // Rows in the same order as the HTML knowledge table.
  // `id` is the stable key used by the frontend - never rename it.
  // `area` is the display label only and can be changed freely.
  rows.push({
    id: "problemUnderstanding",
    area: "Problem Understanding",
    level: level(signals.problemClarity),
    help: needHelp(signals.problemClarity)
  });

  rows.push({
    id: "userContextKnowledge",
    area: "User & Context Knowledge",
    level: level(signals.userUnderstanding),
    help: needHelp(signals.userUnderstanding)
  });

  rows.push({
    id: "coreFunctionalityKnowledge",
    area: "Core Functionality Knowledge",
    level: signals.coreFunctionalityKnowledge ? "Know Enough" : "--",
    help: signals.coreFunctionalityKnowledge ? "FALSE" : "--"
  });

  rows.push({
    id: "developmentRoadmap",
    area: "Development Roadmap",
    level: level(signals.developmentPlan),
    help: needHelp(signals.developmentPlan)
  });

  rows.push({
    id: "designPrototyping",
    area: "Design & Prototyping",
    level: level(signals.designClarity),
    help: needHelp(signals.designClarity)
  });

  rows.push({
    id: "scienceEngineering",
    area: "Science & Engineering Principles",
    level: level(signals.scienceClarity),
    help: needHelp(signals.scienceClarity)
  });

  rows.push({
    id: "materialsKnowledge",
    area: "Materials Knowledge",
    level: level(signals.materialsKnowledge),
    help: needHelp(signals.materialsKnowledge)
  });

  rows.push({
    id: "manufacturingKnowledge",
    area: "Manufacturing Process Knowledge",
    level: level(signals.manufacturingKnowledge),
    help: needHelp(signals.manufacturingKnowledge)
  });

  rows.push({
    id: "electronicsKnowledge",
    area: "Electronics Knowledge",
    level: level(signals.electronicsKnowledge),
    help: needHelp(signals.electronicsKnowledge)
  });

  rows.push({
    id: "componentsKnowledge",
    area: "Components Knowledge",
    level: level(signals.componentsKnowledge),
    help: needHelp(signals.componentsKnowledge)
  });

  rows.push({
    id: "safetyRiskKnowledge",
    area: "Safety & Risk Knowledge",
    level: level(signals.safetyAwareness),
    help: needHelp(signals.safetyAwareness)
  });

  rows.push({
    id: "regulatoryCompliance",
    area: "Regulatory & Compliance Knowledge",
    level: level(signals.complianceAwareness),
    help: needHelp(signals.complianceAwareness)
  });

  rows.push({
    id: "testingValidation",
    area: "Testing & Validation Knowledge",
    level: level(signals.testingStatus),
    help: needHelp(signals.testingStatus)
  });

  rows.push({
    id: "targetSpecifications",
    area: "Target Specifications",
    level: level(signals.targetSpecClarity),
    help: needHelp(signals.targetSpecClarity)
  });

  rows.push({
    id: "failureModesKnowledge",
    area: "Failure Modes Knowledge",
    level: level(signals.failureModesKnowledge),
    help: needHelp(signals.failureModesKnowledge)
  });

  rows.push({
    id: "ipAwareness",
    area: "IP & Prior Art Awareness",
    level: level(signals.ipAwareness),
    help: needHelp(signals.ipAwareness)
  });

  rows.push({
    id: "scalabilityKnowledge",
    area: "Scalability Knowledge",
    level: level(signals.scalabilityKnowledge),
    help: needHelp(signals.scalabilityKnowledge)
  });

  rows.push({
    id: "costEconomicsKnowledge",
    area: "Cost & Economics Knowledge",
    level: level(signals.costEconomicsKnowledge),
    help: needHelp(signals.costEconomicsKnowledge)
  });

  return rows;
}

module.exports = { buildKnowledgeReadiness };
