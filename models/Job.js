const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
{
title: {
type: String,
required: true,
trim: true
},

company: {
type: String,
required: true,
trim: true
},

location: {
type: String,
required: true,
trim: true
},

description: {
type: String
},

skills: [
{
type: String
}
],

experienceLevel: {
type: String,
default: "Not Specified"
},

source: {
type: String,
default: "manual"
},

postedAt: {
type: Date,
default: Date.now
},

applyLink: {
  type: String,
  default: null
},

applySource: {
  type: String,
  default: null
},

lastSeenAt: {
  type: Date,
  default: Date.now
},

isActive: {
  type: Boolean,
  default: true
},

inactiveAt: {
  type: Date,
  default: null
}

},
{ timestamps: true }
);

// TEXT SEARCH INDEX
jobSchema.index({
title: "text",
company: "text",
location: "text"
});

jobSchema.index({
  isActive: 1,
  lastSeenAt: -1
});

jobSchema.index({
  source: 1,
  lastSeenAt: 1,
  isActive: 1
});

module.exports = mongoose.model("Job", jobSchema);
