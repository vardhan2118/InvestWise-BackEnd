const mongoose = require("mongoose");

const GoalSchema = new mongoose.Schema({
  email: String,
  title: String,
  description: String,
  targetDate: Date,
});

const goalModel = mongoose.model("Goal", GoalSchema);

module.exports = goalModel;
