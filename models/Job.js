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

source: {
type: String,
default: "manual"
},

postedAt: {
type: Date,
default: Date.now
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

module.exports = mongoose.model("Job", jobSchema);