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

module.exports = mongoose.model("Conversation", conversationSchema);