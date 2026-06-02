const mongoose =
require("mongoose");

const schema =
new mongoose.Schema({

status:
String,

time:
Date,

message:
String

});

module.exports =
mongoose.model(
"CollectorLog",
schema
);