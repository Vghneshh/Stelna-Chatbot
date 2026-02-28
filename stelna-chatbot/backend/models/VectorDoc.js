const mongoose = require("mongoose");

const VectorSchema = new mongoose.Schema({
  content: String,
  embedding: [Number]
}, {
  collection: "vector_knowledge"
});

module.exports = mongoose.model("VectorDoc", VectorSchema);