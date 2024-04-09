const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    annualIncome: {
      type: Number,
      required: true,
    },
    occupation: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zip: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: true,
    },
  },
  { collection: "profiles" }
);

const profileModel = mongoose.model("Profile", profileSchema);

module.exports = profileModel;
