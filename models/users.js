const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: String,
    email: String,
    password: String,
  },
  { collection: "users" }
);

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;
