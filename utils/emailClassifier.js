const HIGH_VALUE_TYPES = [
  "OFFER",
  "INTERVIEW",
  "ASSESSMENT",
  "APPLICATION",
  "RECRUITER_RESPONSE"
];

const hasAny = (text, phrases) =>
  phrases.some(
    phrase => text.includes(phrase)
  );

const hasCombination = (
  text,
  left,
  right
) => (
  hasAny(text, left) &&
  hasAny(text, right)
);

const isAssessmentEmail = (text) => {
  return hasAny(text, [
    "coding assessment",
    "technical assessment",
    "online assessment",
    "assessment invitation",
    "complete your assessment",
    "take the assessment",
    "coding challenge",
    "technical challenge",
    "hackerrank",
    "codility"
  ]);
};

const isRecruiterResponseEmail = (text) => {
  return (
    text.includes("recruiter response") ||
    hasCombination(
      text,
      [
        "recruiter",
        "talent acquisition",
        "hiring team",
        "hiring manager"
      ],
      [
        "next steps",
        "following up",
        "shortlisted",
        "selected",
        "reply",
        "response"
      ]
    )
  );
};

const isLowRelevanceContent = (text) => {
  const directPhrases = [
    "resume building webinar",
    "ats-friendly resume",
    "career advice session",
    "study abroad",
    "assess your english",
    "english proficiency test",
    "weekly digest",
    "career newsletter",
    "join us live",
    "register now",
    "limited seats"
  ];

  const eventPhrases = [
    "webinar",
    "masterclass",
    "workshop",
    "bootcamp",
    "live session"
  ];

  const eventSignals = [
    "register",
    "join us",
    "reserve your spot",
    "limited seats",
    "free session"
  ];

  const newsletterPhrases = [
    "newsletter",
    "weekly digest",
    "monthly digest"
  ];

  const genericCareerPhrases = [
    "resume tips",
    "resume guide",
    "career advice",
    "career tips",
    "career content"
  ];

  return (
    hasAny(text, directPhrases) ||
    hasCombination(
      text,
      eventPhrases,
      eventSignals
    ) ||
    hasAny(text, newsletterPhrases) ||
    hasAny(text, genericCareerPhrases)
  );
};

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
    isAssessmentEmail(text)
  ) {
    type = "ASSESSMENT";
  }

  else if (
    isRecruiterResponseEmail(text)
  ) {
    type = "RECRUITER_RESPONSE";
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

  if (
    !HIGH_VALUE_TYPES.includes(type) &&
    isLowRelevanceContent(text)
  ) {
    type = "OTHER";
    trust = "ðŸ”´ Filtered";
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
