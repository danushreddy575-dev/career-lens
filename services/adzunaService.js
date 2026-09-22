const axios = require("axios");
const extractSkills = require("../utils/skillExtractor");
const classifyExperience = require("../utils/experienceClassifier");

const ADZUNA_BASE_URL =
  "https://api.adzuna.com/v1/api/jobs/in/search";

const getLocation = (job) => {
  return (
    job.location?.display_name ||
    [
      ...(job.location?.area || [])
    ].filter(Boolean).join(", ") ||
    "India"
  );
};

const normalizeAdzunaJob = (job) => {
  const description =
    job.description || "";

  const company =
    job.company?.display_name ||
    "Unknown";

  const applyLink =
    job.redirect_url ||
    job.application_url ||
    null;

  return {
    title: job.title,
    company,
    location: getLocation(job),
    description,
    skills: extractSkills(
      `${job.title || ""} ${description}`
    ),
    experienceLevel:
      classifyExperience(
        `${job.title || ""} ${description}`
      ),
    postedAt:
      job.created
        ? new Date(job.created)
        : new Date(),
    source: "adzuna",
    applyLink,
    applySource:
      applyLink ? "Adzuna" : null
  };
};

const fetchAdzunaJobs = async ({
  keyword = "software developer",
  page = 1,
  results_per_page = 20,
  location = ""
} = {}) => {
  const appId =
    process.env.ADZUNA_APP_ID;

  const appKey =
    process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.log(
      "Adzuna skipped: missing ADZUNA_APP_ID or ADZUNA_APP_KEY"
    );
    return [];
  }

  const res = await axios.get(
    `${ADZUNA_BASE_URL}/${page}`,
    {
      params: {
        app_id: appId,
        app_key: appKey,
        what: keyword,
        results_per_page,
        ...(location
          ? { where: location }
          : {})
      }
    }
  );

  return (res.data.results || [])
    .filter(job => job.title)
    .map(normalizeAdzunaJob);
};

module.exports = {
  fetchAdzunaJobs,
  normalizeAdzunaJob
};
