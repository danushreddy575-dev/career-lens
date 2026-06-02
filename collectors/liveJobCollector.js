const axios = require("axios");
const Job = require("../models/Job");

async function collectLiveJobs() {

try {

const res =
await axios.get(

"https://jsearch.p.rapidapi.com/search",

{

params:{

query:
"software developer",

page:"1",

num_pages:"1"

},

headers:{

"X-RapidAPI-Key":
process.env.RAPID_API_KEY,

"X-RapidAPI-Host":
process.env.RAPID_API_HOST

}

}

);

const jobs =
res.data.data || [];

for (const job of jobs) {

await Job.updateOne(

{
title:
job.job_title
},

{

title:
job.job_title,

company:
job.employer_name,

location:
job.job_city,

skills:
[],

source:
"JSearch"

},

{

upsert:true

}

);

}

return jobs.length;

}

catch(err){

console.log(
"Collector error:",
err.response?.data
|| err.message
);

throw err;

}

}

module.exports =
collectLiveJobs;