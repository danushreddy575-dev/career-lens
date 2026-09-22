const mongoose = require("mongoose");

const emailJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    emailId: {
      type: String,
      required: true
    },

    subject: String,
    from: String,
    snippet: String,

    source: {
      type: String,
      default: "OTHER"
    },

    organization: {
    type: String,
    default: "UNKNOWN"
    },

    type: {
      type: String,
      default: "OTHER"
    },

    mlType: {
      type: String,
      default: null
    },

    mlConfidence: {
      type: Number,
      default: 0
    },

    classifierVersion: {
      type: String,
      default: null
    },

    classificationSource: {
      type: String,
      enum: [
        "RULE",
        "ML",
        "ML_FALLBACK"
      ],
      default: "RULE"
    },

    trust: {
      type: String,
      default: "🟡 Needs Review"
    },

    opportunityLink: {
    type: String,
    default: null
    },

    opportunityScore: {
    type: Number,
    default: 0
    },

    priority: {
    type: String,
    default: "LOW"
    },

    recruiterEmail: {
    type: String,
    default: ""
    },

    recruiterName: {
    type: String,
    default: ""
    },

    interactionCount: {
    type: Number,
    default: 1
    }
  },
  {
    timestamps: true
  }
);

emailJobSchema.index(
  {
    user: 1,
    emailId: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "EmailJob",
  emailJobSchema
);
