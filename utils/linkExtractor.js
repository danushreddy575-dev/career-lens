const URL_REGEX =
  /(https?:\/\/[^\s<>"']+)/gi;

const PRIORITY_KEYWORDS = [
  "apply",
  "job",
  "career",
  "careers",
  "position",
  "opportunity",
  "greenhouse",
  "lever",
  "workday",
  "smartrecruiters",
  "ashby",
];

const extractOpportunityLink = (text = "") => {
  const urls = text.match(URL_REGEX) || [];

  if (!urls.length) return "";

  const priority = urls.find((url) =>
    PRIORITY_KEYWORDS.some((key) =>
      url.toLowerCase().includes(key)
    )
  );

  return priority || urls[0];
};

module.exports = {
  extractOpportunityLink,
};