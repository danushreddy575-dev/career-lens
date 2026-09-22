const axios = require("axios");
const Job = require("../models/Job");
const extractSkills = require("../utils/skillExtractor");
const classifyExperience = require("../utils/experienceClassifier");
const {
  fetchAdzunaJobs
} = require("../services/adzunaService");
const {
  markStaleMarketJobsInactive
} = require("../utils/jobLifecycle");

const sleep = (ms) =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  );

const buildSearchLink = (job) => {
  const query = [
    job.job_title,
    job.employer_name,
    job.job_city,
    job.job_state,
    job.job_country,
    "careers apply"
  ]
    .filter(Boolean)
    .join(" ");

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
};

const buildJobSearchLink = (job) => {
  const query = [
    job.title,
    job.company,
    job.location,
    "careers apply"
  ]
    .filter(Boolean)
    .join(" ");

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
};

const backfillMissingJSearchLinks = async () => {
  const jobs =
    await Job.find({
      source: {
        $in: [
          "JSearch",
          "jsearch"
        ]
      },
      $or: [
        { applyLink: null },
        { applyLink: "" },
        {
          applyLink: {
            $exists: false
          }
        }
      ]
    }).select(
      "title company location"
    );

  for (const job of jobs) {
    await Job.updateOne(
      {
        _id: job._id
      },
      {
        applyLink:
          buildJobSearchLink(job),
        applySource:
          "Google Search"
      }
    );
  }

  return jobs.length;
};

const backfillMissingExperienceLevels = async () => {
  const jobs =
    await Job.find({
      $or: [
        { experienceLevel: null },
        { experienceLevel: "" },
        {
          experienceLevel: {
            $exists: false
          }
        },
        {
          experienceLevel:
            "Not Specified"
        }
      ]
    }).select(
      "title description experienceLevel"
    );

  let updated = 0;

  for (const job of jobs) {
    const experienceLevel =
      classifyExperience(
        `${job.title || ""} ${job.description || ""}`
      );

    if (
      experienceLevel === job.experienceLevel
    ) {
      continue;
    }

    await Job.updateOne(
      {
        _id: job._id
      },
      {
        experienceLevel
      }
    );

    updated += 1;
  }

  return updated;
};

async function collectLiveJobs() {

try {

const collectionStartedAt =
  new Date();

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

const linkFieldCounts =
jobs.reduce(
  (counts, job) => {
    if (job.job_apply_link) {
      counts.job_apply_link += 1;
    }

    if (job.apply_options?.length) {
      counts.apply_options += 1;
    }

    if (job.job_google_link) {
      counts.job_google_link += 1;
    }

    return counts;
  },
  {
    job_apply_link: 0,
    apply_options: 0,
    job_google_link: 0
  }
);

console.log(
  "JSearch apply link fields:",
  linkFieldCounts
);

const saveJob = async (job) => {
  await Job.updateOne(
    {
      title: job.title,
      company: job.company,
      location: job.location
    },
    {
      ...job,
      lastSeenAt:
        collectionStartedAt,
      isActive: true,
      inactiveAt: null
    },
    {
      upsert: true
    }
  );
};

for (const job of jobs) {

const location =
[
  job.job_city,
  job.job_state,
  job.job_country
]
  .filter(Boolean)
  .join(", ") ||
"Remote";

const applyLink =
job.job_apply_link ||
job.apply_options?.[0]?.apply_link ||
job.job_google_link ||
buildSearchLink(job);

const hasDirectApplyLink =
Boolean(
  job.job_apply_link ||
  job.apply_options?.[0]?.apply_link ||
  job.job_google_link
);

const applySource =
job.apply_options?.[0]?.publisher ||
  (hasDirectApplyLink
    ? "JSearch"
    : "Google Search");

await saveJob({
  title:
    job.job_title,
  company:
    job.employer_name || "Unknown",
  location,
  description:
    job.job_description || "",
  skills:
    extractSkills(
      `${job.job_title || ""} ${job.job_description || ""}`
    ),
  experienceLevel:
    classifyExperience(
      `${job.job_title || ""} ${job.job_description || ""}`
    ),
  postedAt:
    job.job_posted_at_datetime_utc
      ? new Date(
          job.job_posted_at_datetime_utc
        )
      : new Date(),
  source:
    "jsearch",
  applyLink,
  applySource
});

}

const adzunaTargetCities = [
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Noida",
  "Gurgaon",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
  "Coimbatore",
  "Indore",
  "Chandigarh",
  "Bhubaneswar",
  "Visakhapatnam",
  "Lucknow",
  "Nagpur",
  "Mysore",
  "Trivandrum",
  "Vadodara",
  "Surat"
];

const adzunaJobs = [];

for (const location of adzunaTargetCities) {
  try {
    const cityJobs =
      await fetchAdzunaJobs({
        keyword: "software developer",
        page: 1,
        results_per_page: 8,
        location
      });

    adzunaJobs.push(...cityJobs);

    await sleep(350);
  } catch (err) {
    console.log(
      `Adzuna fetch skipped for ${location}:`,
      err.response?.status ||
      err.message
    );
  }
}

for (const job of adzunaJobs) {
  await saveJob(job);
}

const backfilledJSearchLinks =
  await backfillMissingJSearchLinks();

const backfilledExperienceLevels =
  await backfillMissingExperienceLevels();

const deactivatedStaleJobs =
  await markStaleMarketJobsInactive(
    Job
  );

if (backfilledJSearchLinks) {
  console.log(
    `Backfilled ${backfilledJSearchLinks} JSearch apply links`
  );
}

if (backfilledExperienceLevels) {
  console.log(
    `Backfilled ${backfilledExperienceLevels} experience levels`
  );
}

if (deactivatedStaleJobs) {
  console.log(
    `Marked ${deactivatedStaleJobs} stale market jobs inactive`
  );
}

return jobs.length + adzunaJobs.length;

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
