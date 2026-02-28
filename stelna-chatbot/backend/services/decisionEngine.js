function generatePlan(productType, quantity) {
  if (!productType || !quantity) return null;

  if (productType === "plastic") {
    if (quantity < 50) return ["Prototype → 3D Printing"];
    if (quantity <= 500) return ["Pilot → Vacuum Casting"];
    return ["Mass Production → Injection Molding"];
  }

  if (productType === "metal") {
    if (quantity < 100) return ["Prototype → CNC Machining"];
    return ["Production → Sheet Metal Fabrication"];
  }

  return ["Further details required"];
}

module.exports = { generatePlan };
