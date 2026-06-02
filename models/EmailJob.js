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

    trust: {
      type: String,
      default: "🟡 Needs Review"
    },

    opportunityLink: {
    type: String,
    default: null
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