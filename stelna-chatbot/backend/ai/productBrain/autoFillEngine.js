/**
 * Auto-Fill Engine
 * Orchestrates signal-to-PRC conversion
 * Produces complete answer map for frontend
 */

const {
  mapKnowledge,
  mapFunctional,
  mapNonFunctional,
  mapManufacturing
} = require("./prcMapper");
const createSignals = require("./signals");

function mapFeatureType(value) {
  if (value === "required") return "Core";
  if (value === "important") return "Secondary";
  if (value === "optional") return "Optional";
  return "--";
}

function deriveFeatureTypeFromMustHave(mustHave) {
  if (mustHave === null || mustHave === undefined || mustHave === "") return "--";

  const value = mustHave.toString().toLowerCase();

  if (value === "yes" || value === "true" || value === "1") return "Core";
  if (value === "no" || value === "false" || value === "0") return "Optional";

  return "--";
}

/**
 * Generate complete PRC answer map from signals
 * @returns {object} All PRC field IDs mapped to their values
 */
function autoFillPRC(sessionSignals) {
  const signals = sessionSignals || createSignals();
  const knowledge = mapKnowledge(signals);
  const functional = mapFunctional(signals);
  const nonFunctional = mapNonFunctional(signals);
  const manufacturing = mapManufacturing(signals);

  const prcData = {
    // Knowledge sections
    ...knowledge,
    // Functional sections
    ...functional,
    // Non-functional sections (includes target fields)
    ...nonFunctional,
    // Manufacturing sections
    ...manufacturing
  };

  const functionalFeatures = signals.functionalFeatures || {};

  const featureMappings = [
    { featureKey: "coreFunctionality", prcKey: "functional_core_featureType", mustHaveKey: "functional_core_musthave" },
    { featureKey: "energyPower", prcKey: "functional_energy_featureType", mustHaveKey: "functional_energy_musthave" },
    { featureKey: "controlLogic", prcKey: "functional_control_featureType", mustHaveKey: "functional_control_musthave" },
    { featureKey: "userInteraction", prcKey: "functional_interaction_featureType", mustHaveKey: "functional_interaction_musthave" },
    { featureKey: "environmentalProtection", prcKey: "functional_environment_featureType", mustHaveKey: "functional_environment_musthave" },
    { featureKey: "mechanicalStructure", prcKey: "functional_mechanical_featureType", mustHaveKey: "functional_mechanical_musthave" },
    { featureKey: "modularity", prcKey: "functional_modularity_featureType", mustHaveKey: "functional_modularity_musthave" },
    { featureKey: "maintenance", prcKey: "functional_maintenance_featureType", mustHaveKey: "functional_maintenance_musthave" },
    { featureKey: "interfaces", prcKey: "functional_interfaces_featureType", mustHaveKey: "functional_interfaces_musthave" },
    { featureKey: "optionalEnhancements", prcKey: "functional_optional_featureType", mustHaveKey: "functional_optional_musthave" }
  ];

  for (const mapping of featureMappings) {
    const inferred = mapFeatureType(functionalFeatures[mapping.featureKey]);
    const finalValue = inferred !== "--"
      ? inferred
      : deriveFeatureTypeFromMustHave(prcData[mapping.mustHaveKey]);

    console.log("Feature:", mapping.featureKey);
    console.log("MustHave:", prcData[mapping.mustHaveKey]);
    console.log("Inferred:", inferred);
    console.log("FinalValue:", finalValue);

    prcData[mapping.prcKey] = finalValue;
  }

  // Map functional examples to PRC example fields
  const functionalExamples = signals.functionalExamples || {};
  const exampleMappings = [
    { exampleKey: "coreFunctionality", prcKey: "functional_core_example" },
    { exampleKey: "energyPower", prcKey: "functional_energy_example" },
    { exampleKey: "controlLogic", prcKey: "functional_control_example" },
    { exampleKey: "userInteraction", prcKey: "functional_interaction_example" },
    { exampleKey: "environmentalProtection", prcKey: "functional_environment_example" },
    { exampleKey: "mechanicalStructure", prcKey: "functional_mechanical_example" },
    { exampleKey: "modularity", prcKey: "functional_modularity_example" },
    { exampleKey: "maintenance", prcKey: "functional_maintenance_example" },
    { exampleKey: "interfaces", prcKey: "functional_interfaces_example" },
    { exampleKey: "optionalEnhancements", prcKey: "functional_optional_example" }
  ];

  for (const mapping of exampleMappings) {
    const exampleValue = functionalExamples[mapping.exampleKey] || "";
    prcData[mapping.prcKey] = exampleValue;
    if (exampleValue) {
      console.log(`📝 Example mapped: ${mapping.prcKey} = "${exampleValue}"`);
    } else {
      console.log(`📝 Example initialized (empty): ${mapping.prcKey}`);
    }
  }

  // Ensure target text fields are properly populated
  if (signals.productionQuantity) {
    prcData.manufacturing_production_quantity = signals.productionQuantity;
  }

  if (signals.costTarget) {
    prcData.manufacturing_cost_target = signals.costTarget;
  }

  if (signals.weightTarget && typeof signals.weightTarget === "string") {
    prcData.nonfunctional_weight_target = signals.weightTarget;
  }
  prcData.nonfunctional_weight_defined = signals.weightDefined ? "TRUE" : "FALSE";

  if (signals.durabilityTarget && typeof signals.durabilityTarget === "string") {
    prcData.nonfunctional_durability_target = signals.durabilityTarget;
  }
  prcData.nonfunctional_durability_defined = signals.durabilityDefined ? "TRUE" : "FALSE";

  if (signals.safetyTarget && typeof signals.safetyTarget === "string") {
    prcData.nonfunctional_safety_target = signals.safetyTarget;
  }
  prcData.nonfunctional_safety_defined = signals.safetyDefined ? "TRUE" : "FALSE";

  if (signals.complianceTarget && typeof signals.complianceTarget === "string") {
    prcData.nonfunctional_compliance_target = signals.complianceTarget;
  }
  prcData.nonfunctional_compliance_defined = signals.complianceDefined ? "TRUE" : "FALSE";

  if (signals.aestheticTarget && typeof signals.aestheticTarget === "string") {
    prcData.nonfunctional_aesthetics_target = signals.aestheticTarget;
  }
  prcData.nonfunctional_aesthetics_defined = signals.aestheticDefined ? "TRUE" : "FALSE";

  if (signals.usageEnvironment) {
    prcData.nonfunctional_usage_environment = signals.usageEnvironment;
  }

  return prcData;
}

/**
 * Get current signals (for debugging)
 */
function getSignals(sessionSignals) {
  return sessionSignals || createSignals();
}

module.exports = {
  autoFillPRC,
  getSignals
};
