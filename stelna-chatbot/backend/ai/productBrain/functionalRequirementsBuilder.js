function ensureOptionalFeatures(signals) {
  if (!signals) return;
  if (!signals.functionalExamples) {
    signals.functionalExamples = {};
  }
  // Only ensure keys exist — no fake defaults
  if (!signals.functionalExamples.modularity) signals.functionalExamples.modularity = "";
  if (!signals.functionalExamples.maintenance) signals.functionalExamples.maintenance = "";
  if (!signals.functionalExamples.optionalEnhancements) signals.functionalExamples.optionalEnhancements = "";
}

function ensureAllFunctionalRows(signals) {
  if (!signals.functionalExamples) {
    signals.functionalExamples = {};
  }
  // Only ensure the keys exist — do NOT fill in placeholder text.
  // Empty slots stay empty so the PRC shows blank instead of fabricated defaults.
  const keys = [
    "coreFunctionality", "energyPower", "controlLogic", "userInteraction",
    "environmentalProtection", "mechanicalStructure", "modularity",
    "maintenance", "interfaces", "optionalEnhancements"
  ];
  for (const key of keys) {
    if (!signals.functionalExamples[key]) {
      signals.functionalExamples[key] = "";
    }
  }
}

function mapFeatureType(importance) {
  if (!importance) return "--";

  if (importance === "required") return "Core";
  if (importance === "important") return "Supporting";
  if (importance === "optional") return "Optional";

  return "--";
}

function mustHaveLabel(importance) {
  if (importance === "required" || importance === "important") return "Yes";
  if (importance === "optional") return "No";
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
function mapReadinessFlags(signals, featureKey, extractedExamples) {
  const features = signals.functionalFeatures || {};
  const hasFeature = !!features[featureKey] || !!(extractedExamples && extractedExamples[featureKey]); // user has acknowledged this feature (via importance signal or extracted example)

  switch (featureKey) {
    case "coreFunctionality":
      return {
        understandWorking: signals.coreFunctionalityKnowledge ? "TRUE" : "FALSE",
        designDefined: signals.coreFunctionalityKnowledge ? "TRUE" : "FALSE",
        tested: "FALSE"
      };
    case "energyPower":
      if (signals.hasElectronics === false) {
        return { understandWorking: "--", designDefined: "--", tested: "--" };
      }
      return {
        understandWorking: signals.powerSource ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        designDefined: signals.powerSource && signals.powerSource !== signals.coreFunctionalityKnowledge ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        tested: hasFeature ? "FALSE" : "--"
      };
    case "controlLogic":
      if (signals.hasElectronics === false) {
        return { understandWorking: "--", designDefined: "--", tested: "--" };
      }
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
      if (signals.hasElectronics === false) {
        return { understandWorking: "--", designDefined: "--", tested: "--" };
      }
      return {
        understandWorking: signals.connectivity !== undefined ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        designDefined: signals.connectivity === true ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        tested: hasFeature ? "FALSE" : "--"
      };
    case "modularity":
      return {
        understandWorking: hasFeature ? "TRUE" : "--",
        designDefined: signals.otsVsCustomParts ? "TRUE" : (hasFeature ? "FALSE" : "--"),
        tested: hasFeature ? "FALSE" : "--"
      };
    case "maintenance":
      return {
        understandWorking: hasFeature ? "TRUE" : "--",
        designDefined: signals.assemblyApproach ? "TRUE" : (hasFeature ? "FALSE" : "--"),
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

function buildFunctionalRequirements(signals = {}, answers = {}, { partial = false } = {}) {
  // Snapshot which examples were actually extracted BEFORE ensureAllFunctionalRows fills in placeholders.
  // This lets hasFeature distinguish real user-provided examples from default placeholder text.
  const extractedExamples = { ...(signals.functionalExamples || {}) };

  // Clean __none__ markers (used to block LLM re-filling cleared slots)
  const clean = (v) => (v === "__none__" ? "" : (v || ""));
  const cleanFeature = (v) => (v === "__none__" ? null : v);

  if (!partial) {
    ensureAllFunctionalRows(signals);
  }
  const examples = signals.functionalExamples || {};
  const features = signals.functionalFeatures || {};

  const r = (key) => mapReadinessFlags(signals, key, extractedExamples);

  const rows = [
    {
      feature: "Core Functionality",
      example: clean(examples.coreFunctionality),
      mustHave: partial ? mustHaveLabel(cleanFeature(features.coreFunctionality)) : "Yes",
      featureType: partial ? mapFeatureType(cleanFeature(features.coreFunctionality)) : (mapFeatureType(cleanFeature(features.coreFunctionality)) || "Core"),
      ...r("coreFunctionality")
    },
    {
      feature: "Energy / Power",
      example: signals.hasElectronics === false ? "" : clean(examples.energyPower),
      mustHave: signals.hasElectronics === false ? "--" : mustHaveLabel(cleanFeature(features.energyPower)),
      featureType: signals.hasElectronics === false ? "--" : mapFeatureTypeWithCap(cleanFeature(features.energyPower), "Supporting"),
      ...r("energyPower")
    },
    {
      feature: "Control & Logic",
      example: signals.hasElectronics === false ? "" : clean(examples.controlLogic),
      mustHave: signals.hasElectronics === false ? "--" : mustHaveLabel(cleanFeature(features.controlLogic)),
      featureType: signals.hasElectronics === false ? "--" : mapFeatureTypeWithCap(cleanFeature(features.controlLogic), "Supporting"),
      ...r("controlLogic")
    },
    {
      feature: "User Interaction",
      example: clean(examples.userInteraction),
      mustHave: mustHaveLabel(cleanFeature(features.userInteraction)),
      featureType: mapFeatureType(cleanFeature(features.userInteraction)),
      ...r("userInteraction")
    },
    {
      feature: "Environmental Protection",
      example: clean(examples.environmentalProtection),
      mustHave: partial ? mustHaveLabel(cleanFeature(features.environmentalProtection)) : "Yes",
      featureType: partial ? mapFeatureType(cleanFeature(features.environmentalProtection)) : "Core",
      ...r("environmentalProtection")
    },
    {
      feature: "Mechanical Structure",
      example: clean(examples.mechanicalStructure),
      mustHave: mustHaveLabel(cleanFeature(features.mechanicalStructure)),
      featureType: mapFeatureTypeWithCap(cleanFeature(features.mechanicalStructure), "Supporting"),
      ...r("mechanicalStructure")
    },
    {
      feature: "Modularity",
      example: clean(examples.modularity),
      mustHave: mustHaveLabel(cleanFeature(features.modularity)),
      featureType: mapFeatureType(cleanFeature(features.modularity)),
      ...r("modularity")
    },
    {
      feature: "Maintenance",
      example: clean(examples.maintenance),
      mustHave: mustHaveLabel(cleanFeature(features.maintenance)),
      featureType: mapFeatureTypeWithCap(cleanFeature(features.maintenance), "Supporting"),
      ...r("maintenance")
    },
    {
      feature: "Interfaces",
      example: signals.hasElectronics === false ? "" : clean(examples.interfaces),
      mustHave: signals.hasElectronics === false ? "--" : mustHaveLabel(cleanFeature(features.interfaces)),
      featureType: signals.hasElectronics === false ? "--" : mapFeatureTypeWithCap(cleanFeature(features.interfaces), "Supporting"),
      ...r("interfaces")
    },
    {
      feature: "Optional Enhancements",
      example: clean(examples.optionalEnhancements),
      mustHave: mustHaveLabel(cleanFeature(features.optionalEnhancements)),
      featureType: mapFeatureType(cleanFeature(features.optionalEnhancements)) || "Optional",
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
