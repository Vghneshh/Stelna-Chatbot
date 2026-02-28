function decideManufacturingProcess({ quantity, complexity, tolerance }) {

  if (quantity > 5000 && tolerance > 0.1) {
    return "Injection Molding";
  }

  if (complexity === "high" && tolerance <= 0.05) {
    return "CNC Machining";
  }

  if (quantity < 100 && complexity === "high") {
    return "3D Printing";
  }

  return "General Fabrication";
}

module.exports = { decideManufacturingProcess };
