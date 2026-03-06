function ensureOptionalFeatures(signals) {
  if (!signals) return;

  if (!signals.functionalExamples) {
    signals.functionalExamples = {};
  }

  if (!signals.functionalExamples.modularity) {
    signals.functionalExamples.modularity = "Replaceable filter cartridge";
  }

  if (!signals.functionalExamples.maintenance) {
    signals.functionalExamples.maintenance = "Tool-less component replacement";
  }

  if (!signals.functionalExamples.optionalEnhancements) {
    signals.functionalExamples.optionalEnhancements = "Mobile app connectivity";
  }
}

function ensureAllFunctionalRows(signals) {
  if (!signals.functionalExamples) {
    signals.functionalExamples = {};
  }

  const defaults = {
    coreFunctionality: "Primary product functionality",
    energyPower: "Battery or wired power",
    controlLogic: "Automatic or sensor-based control",
    userInteraction: "Buttons, LEDs, or display",
    environmentalProtection: "Basic waterproof enclosure",
    mechanicalStructure: "Product housing and frame",
    modularity: "Replaceable component module",
    maintenance: "Easy cleaning or replacement",
    interfaces: "USB or wireless interface",
    optionalEnhancements: "Mobile app connectivity"
  };

  Object.keys(defaults).forEach((key) => {
    if (!signals.functionalExamples[key]) {
      signals.functionalExamples[key] = defaults[key];
    }
  });
}

function mapFeatureType(importance) {
  if (!importance) return "--";

  if (importance === "required") return "Core";
  if (importance === "important") return "Supporting";
  if (importance === "optional") return "Optional";

  return "--";
}

/**
 * Maps feature importance to a type, capped at the given maximum tier.
 * Prevents supporting features from being promoted to "Core" by aggressive cues.
 * @param {string} importance - "required"|"important"|"optional"|null
 * @param {"Core"|"Supporting"|"Optional"} maxType - Ceiling for this feature
 */
function mapFeatureTypeWithCap(importance, maxType) {
  const rank = { "Core": 3, "Supporting": 2, "Optional": 1, "--": 0 };
  const mapped = mapFeatureType(importance);
  if (rank[mapped] > rank[maxType]) return maxType;
  return mapped || maxType;
}

/**
 * Maps feature signals to readiness flag values (understandWorking / designDefined / tested).
 * Returns "TRUE", "FALSE", or "--" based on available session signals.
 */
function mapReadinessFlags(signals, featureKey) {
  const features = signals.functionalFeatures || {};
  const hasFeature = !!features[featureKey]; // user has acknowledged this feature

  switch (featureKey) {
    case "coreFunctionality":
      return {
        understandWorking: signals.coreFunctionalityKnowledge ? "TRUE" : "FALSE",
        designDefined: signals.coreFunctionalityKnowledge ? "TRUE" : "FALSE",
        tested: "FALSE"
      };
    case "energyPower":
      return {
        understandWorking: signals.powerSource ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        designDefined: signals.powerSource && signals.powerSource !== signals.coreFunctionalityKnowledge ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        tested: hasFeature ? "FALSE" : "--"
      };
    case "controlLogic":
      return {
        understandWorking: hasFeature ? (signals.electronicsKnowledge ? "TRUE" : "FALSE") : "--",
        designDefined: hasFeature ? "FALSE" : "--",
        tested: hasFeature ? "FALSE" : "--"
      };
    case "userInteraction":
      return {
        understandWorking: hasFeature ? "TRUE" : "--",
        designDefined: hasFeature ? "FALSE" : "--",
        tested: hasFeature ? "FALSE" : "--"
      };
    case "environmentalProtection":
      return {
        understandWorking: signals.durabilityNeed !== undefined ? "TRUE" : "FALSE",
        designDefined: signals.durabilityDefined ? "TRUE" : "FALSE",
        tested: "FALSE"
      };
    case "mechanicalStructure":
      return {
        understandWorking: hasFeature ? (signals.componentsKnowledge === "enough" ? "TRUE" : "FALSE") : "--",
        designDefined: signals.weightDefined || signals.componentsKnowledge === "enough" ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        tested: hasFeature ? "FALSE" : "--"
      };
    case "interfaces":
      return {
        understandWorking: signals.connectivity !== undefined ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        designDefined: signals.connectivity === true ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        tested: hasFeature ? "FALSE" : "--"
      };
    default:
      return {
        understandWorking: hasFeature ? "FALSE" : "--",
        designDefined: hasFeature ? "FALSE" : "--",
        tested: hasFeature ? "FALSE" : "--"
      };
  }
}

function buildFunctionalRequirements(signals = {}, answers = {}) {
  ensureAllFunctionalRows(signals);
  const examples = signals.functionalExamples || {};
  const features = signals.functionalFeatures || {};

  const r = (key) => mapReadinessFlags(signals, key);

  const rows = [
    {
      feature: "Core Functionality",
      example: examples.coreFunctionality || "",
      mustHave: "Yes",
      featureType: mapFeatureType(features.coreFunctionality) || "Core",
      ...r("coreFunctionality")
    },
    {
      feature: "Energy / Power",
      example: examples.energyPower || "",
      mustHave: "--",
      featureType: mapFeatureTypeWithCap(features.energyPower, "Supporting"),
      ...r("energyPower")
    },
    {
      feature: "Control & Logic",
      example: examples.controlLogic || "",
      mustHave: "--",
      featureType: mapFeatureTypeWithCap(features.controlLogic, "Supporting"),
      ...r("controlLogic")
    },
    {
      feature: "User Interaction",
      example: examples.userInteraction || "",
      mustHave: "--",
      featureType: mapFeatureType(features.userInteraction),
      ...r("userInteraction")
    },
    {
      feature: "Environmental Protection",
      example: examples.environmentalProtection || "",
      mustHave: "Yes",
      featureType: "Core",
      ...r("environmentalProtection")
    },
    {
      feature: "Mechanical Structure",
      example: examples.mechanicalStructure || "",
      mustHave: "--",
      featureType: mapFeatureTypeWithCap(features.mechanicalStructure, "Supporting"),
      ...r("mechanicalStructure")
    },
    {
      feature: "Modularity",
      example: examples.modularity || "",
      mustHave: "--",
      featureType: mapFeatureType(features.modularity),
      ...r("modularity")
    },
    {
      feature: "Maintenance",
      example: examples.maintenance || "",
      mustHave: "--",
      featureType: mapFeatureTypeWithCap(features.maintenance, "Supporting"),
      ...r("maintenance")
    },
    {
      feature: "Interfaces",
      example: examples.interfaces || "",
      mustHave: "--",
      featureType: mapFeatureTypeWithCap(features.interfaces, "Supporting"),
      ...r("interfaces")
    },
    {
      feature: "Optional Enhancements",
      example: examples.optionalEnhancements || "",
      mustHave: "--",
      featureType: mapFeatureType(features.optionalEnhancements) || "Optional",
      ...r("optionalEnhancements")
    }
  ];

  return rows;
}

module.exports = {
  buildFunctionalRequirements,
  ensureOptionalFeatures,
  ensureAllFunctionalRows
};
