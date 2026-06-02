require("dotenv").config();

const axios =
require("axios");

async function test() {

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
"jsearch.p.rapidapi.com"

}

}

);

console.log(
"SUCCESS"
);

console.log(
res.data.status
);

}

catch(err){

console.log(
err.response?.status
);

console.log(
err.response?.data
);

}

}

test();