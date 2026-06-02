const classifyEmail = (email) => {

  const text = `
    ${email.subject}
    ${email.from}
    ${email.snippet}
  `.toLowerCase();

  let type = "OTHER";
  let source = "OTHER";
  let trust = "🟡 Needs Review";
  let organization = "UNKNOWN";

  // JOB TYPES

  if (
    text.includes("interview")
  ) {
    type = "INTERVIEW";
  }

  else if (
    text.includes("offer")
  ) {
    type = "OFFER";
  }

  else if (
    text.includes("rejected") ||
    text.includes("regret")
  ) {
    type = "REJECTION";
  }

  else if (
    text.includes("application")
  ) {
    type = "APPLICATION";
  }

  else if (
    text.includes("job") ||
    text.includes("hiring") ||
    text.includes("internship")
  ) {
    type = "JOB";
  }

  // SOURCES

  if (
    text.includes("linkedin")
  ) {
    source = "LINKEDIN";
  }

  else if (
    text.includes("naukri")
  ) {
    source = "NAUKRI";
  }

  else if (
    text.includes("unstop")
  ) {
    source = "UNSTOP";
  }

  else if (
    text.includes("internshala")
  ) {
    source = "INTERNSHALA";
  }

  else if (
    text.includes("indeed")
  ) {
    source = "INDEED";
  }

  // FILTERS

  if (
    text.includes("otp") ||
    text.includes("payment") ||
    text.includes("subscription")
  ) {
    trust = "🔴 Filtered";
  }

  else if (
    source !== "OTHER"
  ) {
    trust = "🟢 Trusted";
  }

  const orgChecks = [
  {
    keyword: "micro1",
    value: "MICRO1"
  },
  {
    keyword: "bharat academix",
    value: "BHARAT_ACADEMIX"
  },
  {
    keyword: "amazon",
    value: "AMAZON"
  },
  {
    keyword: "google",
    value: "GOOGLE"
  },
  {
    keyword: "tcs",
    value: "TCS"
  },
  {
    keyword: "infosys",
    value: "INFOSYS"
  },
  {
    keyword: "accenture",
    value: "ACCENTURE"
  }
];

for (const org of orgChecks) {

  if (text.includes(org.keyword)) {
    organization = org.value;
    break;
  }

}

return {
  ...email,
  type,
  source,
  trust,
  organization
};
};

module.exports = classifyEmail;