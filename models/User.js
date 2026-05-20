const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    skills: {
      type: [String],
      default: []
    },

    preferredLocation: {
      type: String,
      default: "Remote"
    },

    preferredJobType: {
      type: String,
      enum: ["Internship", "Full Time", "Part Time", "Remote"],
      default: "Full Time"
    },
    savedJobs: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job"
  }]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);