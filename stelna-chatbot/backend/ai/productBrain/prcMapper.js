function toKnowledgeLevel(value) {
  if (value === null || value === undefined || value === "") return "Don't Know";

  const text = String(value).toLowerCase();
  if (text.includes("enough") || text === "true" || text === "yes") return "Know Enough";
  if (text.includes("partial") || text.includes("some")) return "Know Partially";
  if (text.includes("unknown") || text.includes("don't") || text === "false" || text === "no") return "Don't Know";

  // Default to "Don't Know" instead of "Know Enough" - don't assume knowledge
  return "Don't Know";
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
    knowledge_problem:       toKnowledgeLevel(signals.problemClarity),
    knowledge_user:          toKnowledgeLevel(signals.userUnderstanding),
    knowledge_core_func:     toKnowledgeLevel(signals.coreFunctionalityKnowledge),
    knowledge_planning:      toKnowledgeLevel(signals.developmentPlan),
    knowledge_design:        toKnowledgeLevel(signals.designClarity),
    knowledge_science:       toKnowledgeLevel(signals.scienceClarity),
    knowledge_materials:     toKnowledgeLevel(signals.materialsKnowledge),
    knowledge_mfg:           toKnowledgeLevel(signals.manufacturingKnowledge),
    knowledge_electronics:   toKnowledgeLevel(signals.electronicsKnowledge),
    knowledge_components:    toKnowledgeLevel(signals.componentsKnowledge),
    knowledge_safety:        toKnowledgeLevel(signals.safetyAwareness),
    knowledge_compliance:    toKnowledgeLevel(signals.complianceAwareness),
    knowledge_testing:       toKnowledgeLevel(signals.testingStatus),
    knowledge_specs:         toKnowledgeLevel(signals.targetSpecClarity),
    knowledge_failure:       toKnowledgeLevel(signals.failureModesKnowledge),
    knowledge_ip:            toKnowledgeLevel(signals.ipAwareness),
    knowledge_scalability:   toKnowledgeLevel(signals.scalabilityKnowledge),
    knowledge_cost:          toKnowledgeLevel(signals.costEconomicsKnowledge)
  };

  mapping.knowledge_problem_expert      = toExpertFlag(mapping.knowledge_problem);
  mapping.knowledge_user_expert         = toExpertFlag(mapping.knowledge_user);
  mapping.knowledge_core_func_expert    = toExpertFlag(mapping.knowledge_core_func);
  mapping.knowledge_planning_expert     = toExpertFlag(mapping.knowledge_planning);
  mapping.knowledge_design_expert       = toExpertFlag(mapping.knowledge_design);
  mapping.knowledge_science_expert      = toExpertFlag(mapping.knowledge_science);
  mapping.knowledge_materials_expert    = toExpertFlag(mapping.knowledge_materials);
  mapping.knowledge_mfg_expert          = toExpertFlag(mapping.knowledge_mfg);
  mapping.knowledge_electronics_expert  = toExpertFlag(mapping.knowledge_electronics);
  mapping.knowledge_components_expert   = toExpertFlag(mapping.knowledge_components);
  mapping.knowledge_safety_expert       = toExpertFlag(mapping.knowledge_safety);
  mapping.knowledge_compliance_expert   = toExpertFlag(mapping.knowledge_compliance);
  mapping.knowledge_testing_expert      = toExpertFlag(mapping.knowledge_testing);
  mapping.knowledge_specs_expert        = toExpertFlag(mapping.knowledge_specs);
  mapping.knowledge_failure_expert      = toExpertFlag(mapping.knowledge_failure);
  mapping.knowledge_ip_expert           = toExpertFlag(mapping.knowledge_ip);
  mapping.knowledge_scalability_expert  = toExpertFlag(mapping.knowledge_scalability);
  mapping.knowledge_cost_expert         = toExpertFlag(mapping.knowledge_cost);
  mapping.knowledge_support             = "FALSE";

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

function signalToStatus(value) {
  if (!value) return "FALSE";
  const v = String(value).toLowerCase();
  if (v === "enough" || v === "true" || v === "1" || v === "yes" || v === "partial") return "TRUE";
  return "FALSE";
}

function signalToConf(value) {
  if (!value) return "1";
  const v = String(value).toLowerCase();
  if (v === "enough") return "4";
  if (v === "partial") return "3";
  return "2";
}

function mapManufacturing(signals) {
  // Process identified (Q8: manufacturingKnowledge + manufacturingClarity)
  const processKnown = signalToStatus(signals.manufacturingKnowledge) === "TRUE" || signals.manufacturingClarity;
  const processStatus = processKnown ? "TRUE" : "FALSE";
  const processConf = processKnown ? signalToConf(signals.manufacturingKnowledge) : "1";

  // Material identified (Q6: materialsKnowledge)
  const materialStatus = signalToStatus(signals.materialsKnowledge);
  const materialConf = signalToConf(signals.materialsKnowledge);

  // Prototype (Q7: prototypeStatus)
  const prototypeStatus = signals.prototypeStatus === "exists" ? "TRUE" : "FALSE";

  // Tolerances (Q8: toleranceFitKnowledge)
  const tolStatus = signalToStatus(signals.toleranceFitKnowledge);
  const tolConf = signalToConf(signals.toleranceFitKnowledge);

  // Assembly (Q8: assemblyApproach)
  const assemblyStatus = signals.assemblyApproach ? "TRUE" : "FALSE";

  // Critical parts (Q8/Q11: criticalParts)
  const critStatus = signals.criticalParts ? "TRUE" : "FALSE";

  // OTS vs custom (Q6: otsVsCustomParts)
  const otsStatus = signals.otsVsCustomParts ? "TRUE" : "FALSE";

  // Rough cost estimate (Q10: costAwareness / costEstimate)
  const costStatus = signals.costAwareness || signals.costEstimate ? "TRUE" : "FALSE";

  // Feasibility (manufacturingClarity or feasibilityStatus)
  const feasStatus = signals.feasibilityStatus || signals.manufacturingClarity ? "TRUE" : "FALSE";

  return {
    manufacturing_process_status: processStatus,
    manufacturing_process_vendor: "FALSE",
    manufacturing_process_cost: "FALSE",
    manufacturing_process_confidence: processConf,

    manufacturing_material_status: materialStatus,
    manufacturing_material_vendor: "FALSE",
    manufacturing_material_cost: "FALSE",
    manufacturing_material_confidence: materialConf,

    manufacturing_prototype_status: prototypeStatus,
    manufacturing_prototype_vendor: "FALSE",
    manufacturing_prototype_cost: "FALSE",
    manufacturing_prototype_confidence: prototypeStatus === "TRUE" ? "3" : "1",

    manufacturing_tolerances_status: tolStatus,
    manufacturing_tolerances_vendor: "FALSE",
    manufacturing_tolerances_cost: "FALSE",
    manufacturing_tolerances_confidence: tolConf,

    manufacturing_assembly_status: assemblyStatus,
    manufacturing_assembly_vendor: "FALSE",
    manufacturing_assembly_cost: "FALSE",
    manufacturing_assembly_confidence: assemblyStatus === "TRUE" ? "3" : "1",

    manufacturing_critical_status: critStatus,
    manufacturing_critical_vendor: "FALSE",
    manufacturing_critical_cost: "FALSE",
    manufacturing_critical_confidence: critStatus === "TRUE" ? "3" : "1",

    manufacturing_ots_status: otsStatus,
    manufacturing_ots_vendor: "FALSE",
    manufacturing_ots_cost: "FALSE",
    manufacturing_ots_confidence: otsStatus === "TRUE" ? "3" : "1",

    manufacturing_cost_status: costStatus,
    manufacturing_cost_vendor: "FALSE",
    manufacturing_cost_cost: "FALSE",
    manufacturing_cost_confidence: costStatus === "TRUE" ? "2" : "1",

    manufacturing_feasibility_status: feasStatus,
    manufacturing_feasibility_vendor: "FALSE",
    manufacturing_feasibility_cost: "FALSE",
    manufacturing_feasibility_confidence: "1",

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
