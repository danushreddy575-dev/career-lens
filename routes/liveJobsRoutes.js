const express =
require("express");

const router =
express.Router();

const collectLiveJobs =
require(
"../collectors/liveJobCollector"
);

router.post(
"/sync",

async(req,res)=>{

try{

const total=
await collectLiveJobs();

res.json({

message:
"Jobs collected",

total

});

}

catch{

res.status(500)
.json({

message:
"Collector failed"

});

}

}

);

module.exports =
router;