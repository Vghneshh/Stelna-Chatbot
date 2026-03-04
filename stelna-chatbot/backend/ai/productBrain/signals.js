/**
 * Signals Factory
 * Creates isolated signal state per user session
 */

function createSignals() {
  return {
    // High-level product understanding (managed by productUnderstandingEngine)
    productUnderstanding: null,

    productOverview: null,
    productionQuantity: null,

    productPurpose: null,
    users: null,

    problemClarity: null,
    userUnderstanding: null,
    developmentPlan: null,
    designClarity: null,
    scienceClarity: null,
    materialsKnowledge: null,
    manufacturingKnowledge: null,
    electronicsKnowledge: null,
    componentsKnowledge: null,
    safetyAwareness: null,
    complianceAwareness: null,
    testingStatus: null,
    targetSpecClarity: null,
    supportNeeded: null,

    environment: null,
    durabilityNeed: null,

    powerSource: null,
    automationLevel: null,

    connectivity: null,

    materialClarity: null,
    manufacturingClarity: null,

    costAwareness: null,
    costTarget: null,

    prototypeStatus: null,

    // Non-functional target specifications
    weightTarget: null,
    durabilityTarget: null,
    safetyTarget: null,
    complianceTarget: null,
    aestheticTarget: null,
    usageEnvironment: null,

    // Non-functional defined flags
    weightDefined: false,
    durabilityDefined: false,
    safetyDefined: false,
    complianceDefined: false,
    aestheticDefined: false,

    // Functional feature importance signals
    functionalFeatures: {
      coreFunctionality: null,
      energyPower: null,
      controlLogic: null,
      userInteraction: null,
      environmentalProtection: null,
      mechanicalStructure: null,
      modularity: null,
      maintenance: null,
      interfaces: null,
      optionalEnhancements: null
    },

    // Functional feature examples (descriptive user statements)
    functionalExamples: {
      coreFunctionality: null,
      energyPower: null,
      controlLogic: null,
      userInteraction: null,
      environmentalProtection: null,
      mechanicalStructure: null,
      modularity: null,
      maintenance: null,
      interfaces: null,
      optionalEnhancements: null
    }
  };
}

module.exports = createSignals;
