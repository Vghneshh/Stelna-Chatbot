/**
 * PRC Questions - 28-question set
 *
 * Question order mirrors the four PRC tables:
 *   1. Knowledge Readiness  (q1, q4, q5, q2, q3, q16, q11, q29)
 *   2. Functional Requirements (q6, q8, q9, q10, q14, q25, q27, q28)
 *   3. Non-Functional Requirements (q12, q20, q21, q13)
 *   4. Manufacturing Readiness (q15, q17, q18, q19, q26, q22, q23, q24)
 *
 * NOTE: question IDs (q1_product_and_users, etc.) are stable keys used by
 * signalExtractor.js - never rename them, only reorder positions in this array.
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
    question: "What is your product? Give a brief one-sentence description - and who are your target users?",
    hint: "Just tell me what you're building and who would use it. For example: 'A portable laptop stand for remote workers' or 'A smart water bottle for gym-goers'.",
    covers: ["productOverview", "product", "userUnderstanding", "users"],
    requiresDetail: true
  },

  {
    id: "q4_core_functionality",
    stage: "knowledge",
    question: "Describe the core functionality. What is the primary action or purpose of your product?",
    hint: "What's the ONE main thing your product does? For example: 'It holds a laptop at an angle' or 'It tracks water intake and reminds you to drink'.",
    covers: ["coreFunctionalityKnowledge", "functionalExamples.coreFunctionality"],
    requiresDetail: true
  },

  {
    id: "q5_science_principles",
    stage: "knowledge",
    question: "What scientific or engineering principles does your product rely on?",
    hint: "Think about what makes your product work - is it a hinge mechanism, a sensor, heat transfer, magnets, fluid dynamics? Even simple things like 'gravity' or 'friction' count.",
    covers: ["scienceClarity"],
    requiresDetail: true
  },

  {
    id: "q2_failure_modes",
    stage: "knowledge",
    question: "What are the main failure modes or risks if your product fails?",
    hint: "What could go wrong? Could it break, overheat, leak, collapse, or stop responding? What would happen to the user if it fails?",
    covers: ["failureModesKnowledge", "riskAwareness"],
    requiresDetail: true
  },

  {
    id: "q3_patent_awareness",
    stage: "knowledge",
    question: "Are you aware of any existing similar products, patents, or competitors in this space?",
    hint: "Are there other products on the market that do something similar? Have you checked if anyone has a patent on a similar idea?",
    covers: ["ipAwareness"]
  },

  {
    id: "q16_prototype_testing",
    stage: "knowledge",
    question: "Have you built a prototype or mock-up? If yes, what method - and what testing or validation have you done so far?",
    hint: "Have you made any physical version of your product - even a rough one? Did you 3D print it, carve it, or build it by hand? And have you tested it in any way?",
    covers: ["prototypeStatus", "prototypeMethod", "testingStatus", "designClarity"],
    requiresDetail: true
  },

  {
    id: "q11_materials",
    stage: "knowledge",
    question: "What materials are you considering? (plastic, metal, rubber, composite, etc.)",
    hint: "What would your product be made of? Think about the main body, any moving parts, and the surface the user touches. Common choices: ABS plastic, aluminum, silicone, steel, wood, etc.",
    covers: ["materialsKnowledge"],
    requiresDetail: true
  },

  {
    id: "q29_development_stage",
    stage: "knowledge",
    question: "What development stage are you in right now? (idea, prototype, tested prototype, pilot, production-ready) And what are your next 3 milestones before launch?",
    hint: "How far along are you? Is it just an idea on paper, do you have a working model, or are you ready to manufacture? And what are the next steps you need to take?",
    covers: ["developmentPlan", "designClarity"],
    requiresDetail: true
  },

  // ─── SECTION 2: Functional Requirements ───────────────────────────────────
  // Covers: Energy/Power, Interfaces/Connectivity, User Interaction & Control Logic,
  //         Mechanical Structure, Environmental Protection,
  //         Modularity, Maintenance, Optional Enhancements

  {
    id: "q6_electronics_power",
    stage: "functional",
    question: "Does your product require electronics or sensors? If yes, what powers it? (battery, solar, plug-in, manual, etc.)",
    hint: "Does your product have any electronic parts like sensors, LEDs, motors, or chips? If yes, how does it get power - rechargeable battery, AA batteries, USB plug, solar panel, or is it fully manual/mechanical?",
    covers: ["electronicsKnowledge", "powerSource", "functionalExamples.energyPower"],
    requiresDetail: true
  },

  {
    id: "q8_user_interaction",
    stage: "functional",
    skipIfNoElectronics: true,
    question: "How does the user interact with it, and what feedback do they get? (buttons, displays, LEDs, sounds, vibrations, notifications, etc.)",
    hint: "How does someone use your product? Do they press buttons, use a touchscreen, or is it hands-free? And how does the product respond - does it light up, beep, vibrate, or show something on a screen?",
    covers: ["functionalFeatures.userInteraction", "functionalExamples.userInteraction"],
    requiresDetail: true
  },

  {
    id: "q9_size_weight",
    stage: "functional",
    question: "What are your size and weight constraints or targets?",
    hint: "How big and heavy should your product be? Think about: should it fit in a pocket, a bag, or on a desk? Any weight limit - like under 500g for portability?",
    covers: ["weightTarget", "weightDefined"],
    requiresDetail: true
  },

  {
    id: "q10_durability",
    stage: "functional",
    question: "Does it need to be waterproof, dustproof, drop-proof, or rugged?",
    hint: "Will your product be used in tough conditions? Could it get wet, dusty, or dropped? Does it need to survive outdoor weather or rough handling?",
    covers: ["durabilityNeed", "durabilityTarget", "durabilityDefined", "functionalFeatures.environmentalProtection"],
    requiresDetail: true
  },

  {
    id: "q14_housing_structure",
    stage: "functional",
    question: "What is the main body or housing made of, and how are the parts held together? (e.g., plastic shell with snap-fit, metal frame with screws, 3D-printed enclosure)",
    hint: "Think about the outer shell of your product - is it a plastic case, metal frame, or something else? And how do the pieces connect - screws, clips, glue, or snap-together?",
    covers: ["componentsKnowledge", "functionalExamples.mechanicalStructure"],
    requiresDetail: true
  },

  {
    id: "q25_replaceable_parts",
    stage: "functional",
    question: "Which parts should be replaceable or upgradable by the user or service team?",
    hint: "Can the user swap out anything themselves - like a battery, filter, or tip? Or would a technician need to replace certain components over time?",
    covers: ["functionalFeatures.modularity", "functionalExamples.modularity"],
    requiresDetail: true
  },

  {
    id: "q27_maintenance",
    stage: "functional",
    question: "What regular upkeep will your product need, and how often? (e.g., cleaning, battery replacement, software updates)",
    hint: "Does your product need any regular care - like cleaning, recharging, replacing parts, or updating software? How often would a user need to do this?",
    covers: ["functionalFeatures.maintenance", "functionalExamples.maintenance"],
    requiresDetail: true
  },

  {
    id: "q28_optional_features",
    stage: "functional",
    question: "Are there any nice-to-have features you'd like to add that would make the product even better for users?",
    hint: "Beyond the core functionality, is there anything extra that would be cool to have? Think Bluetooth, app connectivity, customizable colors, accessories, etc.",
    covers: ["functionalFeatures.optionalEnhancements", "functionalExamples.optionalEnhancements"],
    requiresDetail: true
  },

  // ─── SECTION 3: Non-Functional Requirements ───────────────────────────────
  // Covers: Aesthetics, Safety, Compliance, Usage Environment

  {
    id: "q12_aesthetics",
    stage: "nonfunctional",
    question: "How should it look? (modern, rugged, premium, minimalist, colorful, etc.)",
    hint: "What vibe or style should your product have? Think about the look and feel - sleek and premium like Apple? Tough and rugged like outdoor gear? Fun and colorful like a toy?",
    covers: ["aestheticTarget", "aestheticDefined"],
    requiresDetail: true
  },

  {
    id: "q20_safety",
    stage: "nonfunctional",
    question: "What safety or health risks exist? (toxicity, sharp edges, electrical hazards, skin contact, allergens)",
    hint: "Could your product hurt someone? Think about: sharp edges, hot surfaces, electrical shock, toxic materials, choking hazards for kids, or skin irritation from contact.",
    covers: ["safetyAwareness", "safetyTarget", "safetyDefined"],
    requiresDetail: true
  },

  {
    id: "q21_compliance",
    stage: "nonfunctional",
    question: "Are there regulatory requirements? (CE, FDA, RoHS, REACH, export standards)",
    hint: "Does your product need any certifications to be sold legally? For example: CE marking for Europe, FDA for medical/food products, RoHS for electronics, or safety standards for children's products.",
    covers: ["complianceAwareness", "complianceTarget", "complianceDefined"],
    requiresDetail: true
  },

  {
    id: "q13_usage_environment",
    stage: "nonfunctional",
    question: "Where will it be used? (indoor, outdoor, daily portable, or both)",
    hint: "Will people use your product at home, in an office, outdoors, in a car, at a gym? Will they carry it around daily or keep it in one place?",
    covers: ["usageEnvironment", "environment"],
    requiresDetail: true
  },

  // ─── SECTION 4: Manufacturing Readiness ───────────────────────────────────
  // Covers: OTS vs Custom, Manufacturing Process, Tolerances, Assembly,
  //         Critical Parts, Cost, Production Volume, Supply Chain

  {
    id: "q15_parts_strategy",
    stage: "manufacturing",
    question: "Will you use off-the-shelf parts, custom-made parts, or a mix?",
    hint: "Will you buy ready-made components (like standard screws, batteries, motors) or get custom parts made specifically for your product? Most products use a mix of both.",
    covers: ["otsVsCustomParts"],
    requiresDetail: true
  },

  {
    id: "q17_manufacturing_process",
    stage: "manufacturing",
    question: "Which manufacturing method would you use? (injection molding, CNC, 3D printing, assembly, etc.)",
    hint: "How will your product be made? Common methods: injection molding (for plastic parts in bulk), CNC machining (for precise metal parts), 3D printing (for prototypes or small batches), or hand assembly.",
    covers: ["manufacturingKnowledge", "manufacturingClarity", "functionalFeatures.mechanicalStructure"],
    requiresDetail: true
  },

  {
    id: "q18_tolerances",
    stage: "manufacturing",
    question: "How tight are your tolerance and precision requirements?",
    hint: "How precisely do parts need to fit together? For example: does a lid need to snap on perfectly, or is a loose fit okay? Tighter tolerances = more expensive manufacturing.",
    covers: ["toleranceFitKnowledge", "tolerancesConsidered"],
    requiresDetail: true
  },

  {
    id: "q19_assembly",
    stage: "manufacturing",
    question: "Have you thought about assembly approach? (e.g., snap-fit, screws, adhesive, welding, tool-less, manual vs automated assembly)",
    hint: "How will the parts of your product be put together? Will workers assemble it by hand, or will machines do it? Will pieces snap together, get screwed in, or be glued?",
    covers: ["assemblyApproach"],
    requiresDetail: true
  },

  {
    id: "q26_critical_parts",
    stage: "manufacturing",
    question: "Which 3–5 components are critical for safety or performance (cannot fail)?",
    hint: "Which parts absolutely MUST work correctly - if they fail, the product breaks or becomes unsafe? For example: a hinge on a laptop stand, a battery in a device, or a seal on a water bottle.",
    covers: ["criticalPartsKnowledge"],
    requiresDetail: true
  },

  {
    id: "q22_unit_cost",
    stage: "manufacturing",
    question: "What is your estimated unit cost target or manufacturing cost?",
    hint: "How much should it cost to make ONE unit of your product? This includes materials, manufacturing, and assembly - not the selling price. Even a rough range helps, like '$5-10 per unit'.",
    covers: ["costEconomicsKnowledge", "costAwareness", "costEstimate"],
    requiresDetail: true
  },

  {
    id: "q23_production_volume",
    stage: "manufacturing",
    question: "What production volume do you target? (100s, 1000s, millions?)",
    hint: "How many units do you plan to make? A small first batch of 100? A medium run of 5,000? Or mass production of 100,000+? This affects which manufacturing methods make sense.",
    covers: ["productionQuantity", "scalabilityKnowledge"],
    requiresDetail: true
  },

  {
    id: "q24_supply_chain",
    stage: "manufacturing",
    question: "Who would be your suppliers or manufacturing partners?",
    hint: "Do you have any idea who would make your product or supply the parts? This could be a local factory, an overseas manufacturer, or even your own workshop. It's okay if you haven't figured this out yet.",
    covers: ["supplyChainKnowledge"],
    requiresDetail: true
  }

];
