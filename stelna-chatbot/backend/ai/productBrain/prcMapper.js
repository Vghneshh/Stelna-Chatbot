function toKnowledgeLevel(value) {
  if (value === null || value === undefined || value === "") return "Don't Know";

  const text = String(value).toLowerCase();
  if (text.includes("enough") || text === "true" || text === "yes") return "Know Enough";
  if (text.includes("partial") || text.includes("some")) return "Know Partially";
  if (text.includes("unknown") || text.includes("don't") || text === "false" || text === "no") return "Don't Know";

  return "Know Enough";
}

function toExpertFlag(knowledgeLevel) {
  return knowledgeLevel === "Know Enough" ? "FALSE" : "TRUE";
}

function boolString(value) {
  if (value === true) return "TRUE";
  if (value === false) return "FALSE";

  const text = String(value || "").toLowerCase();
  if (text === "true" || text === "yes" || text === "1") return "TRUE";
  if (text === "false" || text === "no" || text === "0") return "FALSE";
  return "FALSE";
}

function mustHaveFromFeatureImportance(importance) {
  if (importance === "required" || importance === "important") return "yes";
  if (importance === "optional") return "no";
  return "no";
}

function mapKnowledge(signals) {
  const mapping = {
    knowledge_problem: toKnowledgeLevel(signals.problemClarity),
    knowledge_user: toKnowledgeLevel(signals.userUnderstanding),
    knowledge_planning: toKnowledgeLevel(signals.developmentPlan),
    knowledge_design: toKnowledgeLevel(signals.designClarity),
    knowledge_science: toKnowledgeLevel(signals.scienceClarity),
    knowledge_materials: toKnowledgeLevel(signals.materialsKnowledge),
    knowledge_mfg: toKnowledgeLevel(signals.manufacturingKnowledge),
    knowledge_electronics: toKnowledgeLevel(signals.electronicsKnowledge),
    knowledge_components: toKnowledgeLevel(signals.componentsKnowledge),
    knowledge_safety: toKnowledgeLevel(signals.safetyAwareness),
    knowledge_compliance: toKnowledgeLevel(signals.complianceAwareness),
    knowledge_testing: toKnowledgeLevel(signals.testingStatus),
    knowledge_specs: toKnowledgeLevel(signals.targetSpecClarity)
  };

  mapping.knowledge_problem_expert = toExpertFlag(mapping.knowledge_problem);
  mapping.knowledge_user_expert = toExpertFlag(mapping.knowledge_user);
  mapping.knowledge_planning_expert = toExpertFlag(mapping.knowledge_planning);
  mapping.knowledge_design_expert = toExpertFlag(mapping.knowledge_design);
  mapping.knowledge_science_expert = toExpertFlag(mapping.knowledge_science);
  mapping.knowledge_materials_expert = toExpertFlag(mapping.knowledge_materials);
  mapping.knowledge_mfg_expert = toExpertFlag(mapping.knowledge_mfg);
  mapping.knowledge_electronics_expert = toExpertFlag(mapping.knowledge_electronics);
  mapping.knowledge_components_expert = toExpertFlag(mapping.knowledge_components);
  mapping.knowledge_safety_expert = toExpertFlag(mapping.knowledge_safety);
  mapping.knowledge_compliance_expert = toExpertFlag(mapping.knowledge_compliance);
  mapping.knowledge_testing_expert = toExpertFlag(mapping.knowledge_testing);
  mapping.knowledge_specs_expert = toExpertFlag(mapping.knowledge_specs);
  mapping.knowledge_support = "FALSE";

  return mapping;
}

function buildFunctionalBlock(prefix, importance) {
  const mustHave = mustHaveFromFeatureImportance(importance);
  const enough = mustHave === "yes" ? "TRUE" : "FALSE";
  return {
    [`functional_${prefix}_musthave`]: mustHave,
    [`functional_${prefix}_understanding`]: enough,
    [`functional_${prefix}_design`]: enough,
    [`functional_${prefix}_tested`]: "FALSE"
  };
}

function mapFunctional(signals) {
  const features = signals.functionalFeatures || {};

  return {
    ...buildFunctionalBlock("core", features.coreFunctionality),
    ...buildFunctionalBlock("energy", features.energyPower),
    ...buildFunctionalBlock("control", features.controlLogic),
    ...buildFunctionalBlock("interaction", features.userInteraction),
    ...buildFunctionalBlock("environment", features.environmentalProtection),
    ...buildFunctionalBlock("mechanical", features.mechanicalStructure),
    ...buildFunctionalBlock("modularity", features.modularity),
    ...buildFunctionalBlock("maintenance", features.maintenance),
    ...buildFunctionalBlock("interfaces", features.interfaces),
    ...buildFunctionalBlock("optional", features.optionalEnhancements)
  };
}

function mapNonFunctional(signals) {
  return {
    nonfunctional_weight_target: typeof signals.weightTarget === "string" ? signals.weightTarget : "",
    nonfunctional_weight_defined: boolString(signals.weightDefined),
    nonfunctional_weight_validated: "FALSE",
    nonfunctional_weight_risk: "Medium",

    nonfunctional_durability_target: typeof signals.durabilityTarget === "string" ? signals.durabilityTarget : "",
    nonfunctional_durability_defined: boolString(signals.durabilityDefined),
    nonfunctional_durability_validated: "FALSE",
    nonfunctional_durability_risk: "Medium",

    nonfunctional_safety_target: typeof signals.safetyTarget === "string" ? signals.safetyTarget : "",
    nonfunctional_safety_defined: boolString(signals.safetyDefined),
    nonfunctional_safety_validated: "FALSE",
    nonfunctional_safety_risk: "Medium",

    nonfunctional_compliance_target: typeof signals.complianceTarget === "string" ? signals.complianceTarget : "",
    nonfunctional_compliance_defined: boolString(signals.complianceDefined),
    nonfunctional_compliance_validated: "FALSE",
    nonfunctional_compliance_risk: "Medium",

    nonfunctional_aesthetics_target: typeof signals.aestheticTarget === "string" ? signals.aestheticTarget : "",
    nonfunctional_aesthetics_defined: boolString(signals.aestheticDefined),
    nonfunctional_aesthetics_validated: "FALSE",
    nonfunctional_aesthetics_risk: "Medium",

    nonfunctional_usage_environment: signals.usageEnvironment || "",
    nonfunctional_environment_defined: signals.usageEnvironment ? "yes" : "no",
    nonfunctional_environment_validated: "FALSE",
    nonfunctional_environment_risk: "Medium"
  };
}

function confidenceFromKnowledge(signals) {
  const knownCount = [
    signals.materialsKnowledge,
    signals.manufacturingKnowledge,
    signals.testingStatus,
    signals.targetSpecClarity
  ].filter(Boolean).length;

  if (knownCount >= 3) return "3";
  if (knownCount >= 1) return "2";
  return "1";
}

function mapManufacturing(signals) {
  const confidence = confidenceFromKnowledge(signals);
  const known = confidence !== "1" ? "TRUE" : "FALSE";

  const base = {
    status: known,
    vendor: "FALSE",
    cost: "FALSE",
    confidence
  };

  return {
    manufacturing_process_status: base.status,
    manufacturing_process_vendor: base.vendor,
    manufacturing_process_cost: base.cost,
    manufacturing_process_confidence: base.confidence,

    manufacturing_material_status: base.status,
    manufacturing_material_vendor: base.vendor,
    manufacturing_material_cost: base.cost,
    manufacturing_material_confidence: base.confidence,

    manufacturing_prototype_status: base.status,
    manufacturing_prototype_vendor: base.vendor,
    manufacturing_prototype_cost: base.cost,
    manufacturing_prototype_confidence: base.confidence,

    manufacturing_tolerances_status: base.status,
    manufacturing_tolerances_vendor: base.vendor,
    manufacturing_tolerances_cost: base.cost,
    manufacturing_tolerances_confidence: base.confidence,

    manufacturing_assembly_status: base.status,
    manufacturing_assembly_vendor: base.vendor,
    manufacturing_assembly_cost: base.cost,
    manufacturing_assembly_confidence: base.confidence,

    manufacturing_critical_status: base.status,
    manufacturing_critical_vendor: base.vendor,
    manufacturing_critical_cost: base.cost,
    manufacturing_critical_confidence: base.confidence,

    manufacturing_ots_status: base.status,
    manufacturing_ots_vendor: base.vendor,
    manufacturing_ots_cost: base.cost,
    manufacturing_ots_confidence: base.confidence,

    manufacturing_cost_status: base.status,
    manufacturing_cost_vendor: base.vendor,
    manufacturing_cost_cost: base.cost,
    manufacturing_cost_confidence: base.confidence,

    manufacturing_feasibility_status: base.status,
    manufacturing_feasibility_vendor: base.vendor,
    manufacturing_feasibility_cost: base.cost,
    manufacturing_feasibility_confidence: base.confidence,

    manufacturing_production_quantity: signals.productionQuantity || "",
    manufacturing_cost_target: signals.costTarget || ""
  };
}

module.exports = {
  mapKnowledge,
  mapFunctional,
  mapNonFunctional,
  mapManufacturing
};
