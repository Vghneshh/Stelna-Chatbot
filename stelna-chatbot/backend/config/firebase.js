const admin = require("firebase-admin");

// Debug logging for environment variables (without exposing sensitive data)
console.log("Firebase Config Debug:");
console.log("- Project ID:", process.env.FIREBASE_PROJECT_ID);
console.log("- Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("- Database URL:", process.env.FIREBASE_DATABASE_URL);
console.log("- Private Key loaded:", !!process.env.FIREBASE_PRIVATE_KEY);

// Validate required environment variables
const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_DATABASE_URL"
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error("❌ Missing Firebase environment variables:", missingVars);
  throw new Error(`Missing required Firebase environment variables: ${missingVars.join(", ")}`);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Firebase Admin SDK initialization failed:", error.message);
  throw error;
}

const db = admin.database();

module.exports = db;
