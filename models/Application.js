const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    company: {
      type: String,
      required: true
    },

    role: {
      type: String,
      required: true
    },

    source: {
      type: String,
      enum: ["MARKET_JOB", "EMAIL", "MANUAL"],
      default: "MANUAL"
    },

    status: {
      type: String,
      enum: [
        "FAVORITE",
        "TO_APPLY",
        "APPLIED",
        "PROCESSING",
        "INTERVIEW",
        "ACCEPTED",
        "REJECTED",
        "ARCHIVED"
      ],
      default: "TO_APPLY"
    },

    notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

applicationSchema.index(
  {
    user: 1,
    company: 1,
    role: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "Application",
  applicationSchema
);