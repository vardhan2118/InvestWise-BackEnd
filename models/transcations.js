const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: String,
  amount: Number,
  transactionType: String,
  email: String,
  date: { type: Date, default: Date.now },
});

const transactionModel = mongoose.model("Transaction", transactionSchema);

module.exports = transactionModel;
