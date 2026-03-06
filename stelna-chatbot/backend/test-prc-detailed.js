const axios = require("axios");

const API = "http://localhost:5000/chat";
const sessionId = "debug-session-" + Date.now();

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
  "Office workers and athletes",
  "Weight 300g, IP67, $15 target cost"  // 13th message - answer to q12
];

async function runTest() {
  for (let i = 0; i < answers.length; i++) {
    const msg = answers[i];
    const res = await axios.post(API, {
      message: msg,
      sessionId
    });

    console.log(`\n[${i + 1}/${answers.length}] RESPONSE TYPE: ${res.data.type}`);
    
    if (res.data.question) {
      console.log(`    QUESTION: ${res.data.question.substring(0, 60)}...`);
    }

    if (res.data.type === "prc_redirect") {
      console.log("\n✅ === PRC COMPLETE ===\n");
      
      console.log("Functional Requirements:", res.data.functionalRequirements ? res.data.functionalRequirements.length + " objects" : "❌ MISSING");
      console.log("Non-Functional Requirements:", res.data.nonFunctionalRequirements ? res.data.nonFunctionalRequirements.length + " objects" : "❌ MISSING");
      console.log("Manufacturing Readiness:", res.data.manufacturingReadiness ? res.data.manufacturingReadiness.length + " objects" : "❌ MISSING");
      
      if (res.data.functionalRequirements) {
        console.log("\n✅ Functional sample:", res.data.functionalRequirements[0]);
      }
      if (res.data.nonFunctionalRequirements) {
        console.log("✅ Non-Functional sample:", res.data.nonFunctionalRequirements[0]);
      }
      if (res.data.manufacturingReadiness) {
        console.log("✅ Manufacturing sample:", res.data.manufacturingReadiness[0]);
      }
      
      break;
    }
    
    if (res.data.done && res.data.type !== "prc_redirect") {
      console.log("⚠️  PRC marked done but no redirect!");
      console.log("Response:", JSON.stringify(res.data, null, 2));
    }
  }
}

runTest().catch(err => console.error("❌ ERROR:", err.message));
