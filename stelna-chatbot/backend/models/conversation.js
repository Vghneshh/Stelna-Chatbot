const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  sessionId: String,
  intent: {
    productType: String,
    materialType: String,
    quantity: Number,
    stage: String
  },
  messages: [messageSchema],
  pricingRequested: Boolean,
  quotationStatus: String
}, { timestamps: true });

const prcFlowSchema = new mongoose.Schema({
  inProgress: { type: Boolean, default: false },
  currentQuestion: { type: Number, default: 0 },
  answers: { type: mongoose.Schema.Types.Mixed, default: {} }
});

conversationSchema.add({ 
  flowState: { type: String, default: "MENU" },  // "MENU" or "PRC"
  prcFlow: prcFlowSchema
});

module.exports = mongoose.model("Conversation", conversationSchema);