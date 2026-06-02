const mongoose = require("mongoose");

const emailConnectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    email: {
      type: String,
      required: true
    },

    provider: {
      type: String,
      default: "gmail"
    },

    accessToken: {
      type: String,
      default: ""
    },

    refreshToken: {
      type: String,
      default: ""
    },

    connected: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "EmailConnection",
  emailConnectionSchema
);