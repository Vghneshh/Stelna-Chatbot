const axios = require("axios");

const API = "http://localhost:5000/chat";
const sessionId = "debug-session";

const answers = [
  "check product readiness",
  "I want to build a smart water bottle with LED reminder",
  "It reminds users to drink water",
  "I have a simple prototype",
  "I tested the reminder system",
  "Injection molding for bottle body",
  "BPA free plastic",
  "Yes it uses electronics and battery",
  "CE certification needed",
  "Electronics assembled in base",
  "I need help with PCB design",
  "Office workers and athletes"
];

async function runTest() {
  for (let msg of answers) {
    const res = await axios.post(API, {
      message: msg,
      sessionId
    });

    console.log("RESPONSE TYPE:", res.data.type);

    if (res.data.type === "prc_redirect") {
      console.log("\n=== FINAL PRC DATA ===\n");
      
      console.log("Functional Requirements:", res.data.functionalRequirements ? res.data.functionalRequirements.length + " objects" : "MISSING");
      console.log("Non-Functional Requirements:", res.data.nonFunctionalRequirements ? res.data.nonFunctionalRequirements.length + " objects" : "MISSING");
      console.log("Manufacturing Readiness:", res.data.manufacturingReadiness ? res.data.manufacturingReadiness.length + " objects" : "MISSING");
      
      console.log("\n=== DETAILED DATA ===\n");
      console.log("Functional:", JSON.stringify(res.data.functionalRequirements, null, 2));
      console.log("\nNon-Functional:", JSON.stringify(res.data.nonFunctionalRequirements, null, 2));
      console.log("\nManufacturing:", JSON.stringify(res.data.manufacturingReadiness, null, 2));
    }
  }
}

runTest().catch(err => console.error("ERROR:", err.message));
