/**
 * Transfers flat extracted signals (weightTarget, aestheticTarget, etc.)
 * into the nested signals.nonFunctional structure so they take priority
 * over the hardcoded defaults applied by ensureNonFunctionalRequirements.
 * Must be called BEFORE ensureNonFunctionalRequirements.
 */
function hydrateNonFunctionalFromSignals(signals) {
  if (!signals.nonFunctional) signals.nonFunctional = {};
  const nf = signals.nonFunctional;

  if (signals.weightTarget && !nf.weight) {
    nf.weight = {
      target: String(signals.weightTarget),
      defined: !!signals.weightDefined,
      validated: false,
      risk: "Medium"
    };
  }

  if (signals.durabilityTarget && !nf.durability) {
    const dt = typeof signals.durabilityTarget === "string"
      ? signals.durabilityTarget
      : "waterproof / dust-resistant";
    nf.durability = {
      target: dt,
      defined: !!signals.durabilityDefined,
      validated: false,
      risk: "Medium"
    };
  }

  if (signals.safetyTarget && signals.safetyTarget !== true && !nf.safety) {
    nf.safety = {
      target: String(signals.safetyTarget),
      defined: !!signals.safetyDefined,
      validated: false,
      risk: "Low"
    };
  }

  if (signals.complianceTarget && signals.complianceTarget !== true && !nf.compliance) {
    nf.compliance = {
      target: String(signals.complianceTarget),
      defined: !!signals.complianceDefined,
      validated: false,
      risk: "Medium"
    };
  }

  if (signals.aestheticTarget && signals.aestheticTarget !== true && !nf.aesthetics) {
    nf.aesthetics = {
      target: String(signals.aestheticTarget),
      defined: !!signals.aestheticDefined,
      validated: false,
      risk: "Low"
    };
  }

  if (signals.usageEnvironment && !nf.usageEnvironment) {
    nf.usageEnvironment = {
      target: signals.usageEnvironment,
      defined: true,
      validated: false,
      risk: "Low"
    };
  }
}

function ensureNonFunctionalRequirements(signals) {
  if (!signals.nonFunctional) {
    signals.nonFunctional = {};
  }

  const defaults = {
    weight: {
      target: "Not specified",
      defined: false,
      validated: false,
      risk: "Unknown"
    },

    durability: {
      target: "Not specified",
      defined: false,
      validated: false,
      risk: "Unknown"
    },

    safety: {
      target: "Not specified",
      defined: false,
      validated: false,
      risk: "Unknown"
    },

    compliance: {
      target: "Not specified",
      defined: false,
      validated: false,
      risk: "Unknown"
    },

    aesthetics: {
      target: "Not specified",
      defined: false,
      validated: false,
      risk: "Unknown"
    },

    usageEnvironment: {
      target: "Not specified",
      defined: false,
      validated: false,
      risk: "Unknown"
    }
  };

  Object.keys(defaults).forEach((key) => {
    if (!signals.nonFunctional[key]) {
      signals.nonFunctional[key] = defaults[key];
    }
  });
}

module.exports = { hydrateNonFunctionalFromSignals, ensureNonFunctionalRequirements };
