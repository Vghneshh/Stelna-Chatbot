/**
 * PRC Questions — 28-question set
 *
 * Question order mirrors the four PRC tables:
 *   1. Knowledge Readiness  (q1, q4, q5, q2, q3, q16, q11, q29)
 *   2. Functional Requirements (q6, q8, q9, q10, q14, q25, q27, q28)
 *   3. Non-Functional Requirements (q12, q20, q21, q13)
 *   4. Manufacturing Readiness (q15, q17, q18, q19, q26, q22, q23, q24)
 *
 * NOTE: question IDs (q1_product_and_users, etc.) are stable keys used by
 * signalExtractor.js — never rename them, only reorder positions in this array.
 *
 * Stages: knowledge | functional | nonfunctional | manufacturing
 */

module.exports = [

  // ─── SECTION 1: Knowledge Readiness ───────────────────────────────────────
  // Covers: Problem Understanding, User & Context, Core Functionality,
  //         Science & Engineering, Failure Modes, IP & Prior Art,
  //         Design & Prototyping, Testing & Validation, Materials, Development Roadmap

  {
    id: "q1_product_and_users",
    stage: "knowledge",
    question: "What is your product? Give a brief one-sentence description — and who are your target users?",
    covers: ["productOverview", "product", "userUnderstanding", "users"]
  },

  {
    id: "q4_core_functionality",
    stage: "knowledge",
    question: "Describe the core functionality. What is the primary action or purpose of your product?",
    covers: ["coreFunctionalityKnowledge", "functionalExamples.coreFunctionality"]
  },

  {
    id: "q5_science_principles",
    stage: "knowledge",
    question: "What scientific or engineering principles does your product rely on?",
    covers: ["scienceClarity"]
  },

  {
    id: "q2_failure_modes",
    stage: "knowledge",
    question: "What are the main failure modes or risks if your product fails?",
    covers: ["failureModesKnowledge", "riskAwareness"]
  },

  {
    id: "q3_patent_awareness",
    stage: "knowledge",
    question: "Are you aware of any existing similar products, patents, or competitors in this space?",
    covers: ["ipAwareness"]
  },

  {
    id: "q16_prototype_testing",
    stage: "knowledge",
    question: "Have you built a prototype or mock-up? If yes, what method — and what testing or validation have you done so far?",
    covers: ["prototypeStatus", "prototypeMethod", "testingStatus", "designClarity"]
  },

  {
    id: "q11_materials",
    stage: "knowledge",
    question: "What materials are you considering? (plastic, metal, rubber, composite, etc.)",
    covers: ["materialsKnowledge"]
  },

  {
    id: "q29_development_stage",
    stage: "knowledge",
    question: "What development stage are you in right now? (idea, prototype, tested prototype, pilot, production-ready) And what are your next 3 milestones before launch?",
    covers: ["developmentPlan", "designClarity"]
  },

  // ─── SECTION 2: Functional Requirements ───────────────────────────────────
  // Covers: Energy/Power, Interfaces/Connectivity, User Interaction & Control Logic,
  //         Mechanical Structure, Environmental Protection,
  //         Modularity, Maintenance, Optional Enhancements

  {
    id: "q6_electronics_power",
    stage: "functional",
    question: "Does your product require electronics or sensors? If yes, what powers it? (battery, solar, plug-in, manual, etc.)",
    covers: ["electronicsKnowledge", "powerSource", "functionalExamples.energyPower"]
  },

  {
    id: "q8_user_interaction",
    stage: "functional",
    skipIfNoElectronics: true,
    question: "How does the user interact with it, and what feedback do they get? (buttons, displays, LEDs, sounds, vibrations, notifications, etc.)",
    covers: ["functionalFeatures.userInteraction", "functionalExamples.userInteraction"]
  },

  {
    id: "q9_size_weight",
    stage: "functional",
    question: "What are your size and weight constraints or targets?",
    covers: ["weightTarget", "weightDefined"]
  },

  {
    id: "q10_durability",
    stage: "functional",
    question: "Does it need to be waterproof, dustproof, drop-proof, or rugged?",
    covers: ["durabilityNeed", "durabilityTarget", "durabilityDefined", "functionalFeatures.environmentalProtection"]
  },

  {
    id: "q14_housing_structure",
    stage: "functional",
    question: "What is the main body or housing made of, and how are the parts held together? (e.g., plastic shell with snap-fit, metal frame with screws, 3D-printed enclosure)",
    covers: ["componentsKnowledge", "functionalExamples.mechanicalStructure"]
  },

  {
    id: "q25_replaceable_parts",
    stage: "functional",
    question: "Which parts should be replaceable or upgradable by the user or service team?",
    covers: ["functionalFeatures.modularity", "functionalExamples.modularity"]
  },

  {
    id: "q27_maintenance",
    stage: "functional",
    question: "What regular upkeep will your product need, and how often? (e.g., cleaning, battery replacement, software updates)",
    covers: ["functionalFeatures.maintenance", "functionalExamples.maintenance"]
  },

  {
    id: "q28_optional_features",
    stage: "functional",
    question: "Are there any nice-to-have features you'd like to add that would make the product even better for users?",
    covers: ["functionalFeatures.optionalEnhancements", "functionalExamples.optionalEnhancements"]
  },

  // ─── SECTION 3: Non-Functional Requirements ───────────────────────────────
  // Covers: Aesthetics, Safety, Compliance, Usage Environment

  {
    id: "q12_aesthetics",
    stage: "nonfunctional",
    question: "How should it look? (modern, rugged, premium, minimalist, colorful, etc.)",
    covers: ["aestheticTarget", "aestheticDefined"]
  },

  {
    id: "q20_safety",
    stage: "nonfunctional",
    question: "What safety or health risks exist? (toxicity, sharp edges, electrical hazards, skin contact, allergens)",
    covers: ["safetyAwareness", "safetyTarget", "safetyDefined"]
  },

  {
    id: "q21_compliance",
    stage: "nonfunctional",
    question: "Are there regulatory requirements? (CE, FDA, RoHS, REACH, export standards)",
    covers: ["complianceAwareness", "complianceTarget", "complianceDefined"]
  },

  {
    id: "q13_usage_environment",
    stage: "nonfunctional",
    question: "Where will it be used? (indoor, outdoor, daily portable, or both)",
    covers: ["usageEnvironment", "environment"]
  },

  // ─── SECTION 4: Manufacturing Readiness ───────────────────────────────────
  // Covers: OTS vs Custom, Manufacturing Process, Tolerances, Assembly,
  //         Critical Parts, Cost, Production Volume, Supply Chain

  {
    id: "q15_parts_strategy",
    stage: "manufacturing",
    question: "Will you use off-the-shelf parts, custom-made parts, or a mix?",
    covers: ["otsVsCustomParts"]
  },

  {
    id: "q17_manufacturing_process",
    stage: "manufacturing",
    question: "Which manufacturing method would you use? (injection molding, CNC, 3D printing, assembly, etc.)",
    covers: ["manufacturingKnowledge", "manufacturingClarity", "functionalFeatures.mechanicalStructure"]
  },

  {
    id: "q18_tolerances",
    stage: "manufacturing",
    question: "How tight are your tolerance and precision requirements?",
    covers: ["toleranceFitKnowledge", "tolerancesConsidered"]
  },

  {
    id: "q19_assembly",
    stage: "manufacturing",
    question: "Have you thought about assembly approach? (e.g., snap-fit, screws, adhesive, welding, tool-less, manual vs automated assembly)",
    covers: ["assemblyApproach"]
  },

  {
    id: "q26_critical_parts",
    stage: "manufacturing",
    question: "Which 3–5 components are critical for safety or performance (cannot fail)?",
    covers: ["criticalPartsKnowledge"]
  },

  {
    id: "q22_unit_cost",
    stage: "manufacturing",
    question: "What is your estimated unit cost target or manufacturing cost?",
    covers: ["costEconomicsKnowledge", "costAwareness", "costEstimate"]
  },

  {
    id: "q23_production_volume",
    stage: "manufacturing",
    question: "What production volume do you target? (100s, 1000s, millions?)",
    covers: ["productionQuantity", "scalabilityKnowledge"]
  },

  {
    id: "q24_supply_chain",
    stage: "manufacturing",
    question: "Who would be your suppliers or manufacturing partners?",
    covers: ["supplyChainKnowledge"]
  }

];
