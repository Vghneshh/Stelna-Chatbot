module.exports = [
  {
    id: "q1_product",
    signal: "productOverview",
    question:
      "What's your product? What problem are you solving?\n\n• Who is the user?\n• What domain does it belong to?\n\nExample: A smart water bottle for athletes that tracks hydration levels and syncs with fitness apps."
  },

  {
    id: "q2_roadmap",
    signal: "developmentPlan",
    question:
      "Do you have a product development roadmap in mind?\n\nExample: Timeline for prototype → testing → pilot production → launch"
  },

  {
    id: "q3_design",
    signal: "designClarity",
    question:
      "Have you done concept sketches? Created prototypes?\n\nExample:\n• Hand sketches or CAD designs\n• 3D printed models\n• Functional prototypes for testing"
  },

  {
    id: "q4_function",
    signal: "scienceClarity",
    question:
      "What's the primary function of the product?\n\nAre you aware of the science and technology principles involved?\n\nExample: Water flow sensors, Bluetooth Low Energy communication, battery management systems"
  },

  {
    id: "q5_materials",
    signal: "materialsKnowledge",
    question:
      "Are you aware of the prototyping technologies and materials suitable for your product?\n\nExample:\n• 3D printing with PLA/ABS\n• CNC machining for metal parts\n• Injection molding for production\n• Food-grade plastics (PP, Tritan)"
  },

  {
    id: "q6_compliance",
    signal: "complianceAwareness",
    question:
      "Are you aware of government regulations, international standards, or compliances for products in this category?\n\nExample:\n• CE / FCC for electronics\n• FDA approval for food contact\n• RoHS compliance\n• IP ratings for water resistance"
  },

  {
    id: "q7_testing",
    signal: "testingStatus",
    question:
      "How do you test and validate the product?\n\nExample:\n• Drop tests for durability\n• Water resistance testing (IP67/IP68)\n• Battery life testing\n• User acceptance testing\n• Sensor accuracy validation"
  },

  {
    id: "q8_safety",
    signal: "safetyAwareness",
    question:
      "What are the safety factors involved with the product?\n\nExample:\n• Battery safety (overcharge protection, thermal management)\n• Material safety (non-toxic, skin-safe)\n• Sharp edges, pinch points\n• Electrical safety standards"
  },

  {
    id: "q9_electronics",
    signal: "electronicsKnowledge",
    question:
      "Is electronics involved in the product?\n\nExample:\n• Sensors (temperature, pressure, motion)\n• Microcontrollers (Arduino, ESP32, STM32)\n• Wireless connectivity (Bluetooth, WiFi)\n• Display (LCD, OLED)\n• Battery and charging circuit"
  },

  {
    id: "q10_components",
    signal: "componentsKnowledge",
    question:
      "Are you aware of the components required?\n\nExample:\n• Custom PCB design\n• Sensors and ICs\n• Mechanical parts (springs, gaskets, seals)\n• Fasteners (screws, clips)\n• Packaging materials"
  },

  {
    id: "q11_support",
    signal: "supportNeeded",
    question:
      "Are you looking for expert guidance or outsourcing work for any of the following?\n\n• Problem analysis\n• Planning\n• Design\n• Electronics\n• Prototyping\n• Production\n\nExample: 'Yes, need help with electronics design and production planning' or 'No, handling everything in-house'"
  },

  {
    id: "q12_specs",
    signal: "targetSpecClarity",
    question:
      "Do you have any target specifications?\n\nExample:\n• Weight: under 200g\n• Color: matte black or white\n• Dimensions: 250mm height, 75mm diameter\n• Battery life: 7 days\n• Capacity: 500ml"
  }

];
