/**
 * Transfers flat extracted signals into the nested signals.manufacturing
 * structure so they take priority over defaults set by ensureManufacturingReadiness.
 * Must be called BEFORE ensureManufacturingReadiness.
 */
function hydrateManufacturingFromSignals(signals) {
  if (!signals.manufacturing) signals.manufacturing = {};
  const mfg = signals.manufacturing;

  if (signals.prototypeStatus === "exists" && !mfg.prototypeMethod) {
    mfg.prototypeMethod = { status: true, vendor: false, cost: false, confidence: 3 };
  }

  if (signals.manufacturingKnowledge === "enough" && !mfg.manufacturingProcess) {
    mfg.manufacturingProcess = { status: true, vendor: false, cost: false, confidence: 4 };
  }

  if (signals.materialsKnowledge === "enough" && !mfg.materialIdentified) {
    mfg.materialIdentified = { status: true, vendor: false, cost: false, confidence: 3 };
  }

  if (signals.toleranceFitKnowledge === "enough" && !mfg.tolerances) {
    mfg.tolerances = { status: true, vendor: false, cost: false, confidence: 3 };
  }

  if (signals.assemblyApproach && !mfg.assemblyApproach) {
    mfg.assemblyApproach = { status: true, vendor: false, cost: false, confidence: 3 };
  }

  if (signals.componentsKnowledge === "enough" && !mfg.criticalParts) {
    mfg.criticalParts = { status: true, vendor: false, cost: false, confidence: 3 };
  }

  if (signals.otsVsCustomParts && !mfg.otsVsCustom) {
    mfg.otsVsCustom = { status: true, vendor: false, cost: false, confidence: 3 };
  }

  if ((signals.costAwareness || signals.costEstimate) && !mfg.roughCost) {
    mfg.roughCost = { status: true, vendor: false, cost: false, confidence: 2 };
  }

  if ((signals.manufacturingClarity || signals.feasibilityStatus) && !mfg.feasibility) {
    mfg.feasibility = { status: true, vendor: false, cost: false, confidence: 2 };
  }
}

function ensureManufacturingReadiness(signals) {
  if (!signals.manufacturing) {
    signals.manufacturing = {};
  }

  const defaults = {
    manufacturingProcess: {
      status: false,
      vendor: false,
      cost: false,
      confidence: 2
    },

    materialIdentified: {
      status: false,
      vendor: false,
      cost: false,
      confidence: 2
    },

    prototypeMethod: {
      status: true,
      vendor: false,
      cost: false,
      confidence: 3
    },

    tolerances: {
      status: false,
      vendor: false,
      cost: false,
      confidence: 2
    },

    assemblyApproach: {
      status: false,
      vendor: false,
      cost: false,
      confidence: 2
    },

    criticalParts: {
      status: false,
      vendor: false,
      cost: false,
      confidence: 2
    },

    otsVsCustom: {
      status: false,
      vendor: false,
      cost: false,
      confidence: 2
    },

    roughCost: {
      status: false,
      vendor: false,
      cost: false,
      confidence: 2
    },

    feasibility: {
      status: false,
      vendor: false,
      cost: false,
      confidence: 2
    }
  };

  Object.keys(defaults).forEach((key) => {
    if (!signals.manufacturing[key]) {
      signals.manufacturing[key] = defaults[key];
    }
  });
}

module.exports = { hydrateManufacturingFromSignals, ensureManufacturingReadiness };
