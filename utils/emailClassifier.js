const HIGH_VALUE_TYPES = [
  "OFFER",
  "INTERVIEW",
  "ASSESSMENT",
  "APPLICATION",
  "RECRUITER_RESPONSE"
];

const TRUSTED_OPPORTUNITY_TYPES = [
  ...HIGH_VALUE_TYPES,
  "JOB"
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

const isOfferEmail = (text) => {
  return hasAny(text, [
    "job offer",
    "offer letter",
    "pleased to offer",
    "we are delighted to offer",
    "congratulations on your offer",
    "selected for the role",
    "you have been selected",
    "we would like to offer"
  ]);
};

const isApplicationEmail = (text) => {
  return hasAny(text, [
    "application successfully submitted",
    "successfully submitted your application",
    "your application for",
    "we received your application",
    "application received",
    "thank you for applying",
    "thanks for applying",
    "you applied for",
    "application is complete"
  ]);
};

const isCompetitionEmail = (text) => {
  return hasAny(text, [
    "precision care challenge",
    "challenge 2026",
    "hackathon",
    "coding competition",
    "innovation challenge",
    "prize pool",
    "lakhs pool",
    "standout solution",
    "build a standout project"
  ]);
};

const isAccountSecurityEmail = (text) => {
  return hasAny(text, [
    "third-party github application",
    "github application has been added",
    "immediate action required",
    "oauth2 keys exposed",
    "keys exposed on github",
    "payment declined",
    "subscription",
    "verification code",
    "otp",
    "security alert",
    "sign-in attempt",
    "password reset",
    "terms and conditions",
    "terms & conditions",
    "schedule of charges",
    "savings account",
    "bank account",
    "credit card",
    "upi transaction",
    "monthly statement",
    "privacy policy",
    "terms of service",
    "subscription renewal",
    "order has shipped",
    "delivery update"
  ]);
};

const isLowRelevanceContent = (text) => {
  const directPhrases = [
    "resume building webinar",
    "ats-friendly resume",
    "ats resume",
    "ats friendly",
    "career advice session",
    "study abroad",
    "study abroad webinar",
    "study abroad fair",
    "assess your english",
    "english proficiency test",
    "ielts",
    "toefl",
    "weekly digest",
    "career newsletter",
    "product update",
    "plugin announcement",
    "introducing mongodb atlas",
    "mongodb atlas connectors",
    "connectors and plugins",
    "plugins for agents",
    "developer tools",
    "platform plugins",
    "new connectors",
    "marketing campaign",
    "promotional",
    "own your story",
    "lgbtqia+ event",
    "event at kpmg",
    "forage",
    "challenge 2026",
    "precision care challenge",
    "prize pool",
    "lakhs pool",
    "standout solution",
    "degree program",
    "online mca",
    "career acceleration platform",
    "academy pro",
    "enrol in",
    "enroll in",
    "premium career acceleration",
    "join us live",
    "register now",
    "limited seats"
  ];

  const eventPhrases = [
    "webinar",
    "masterclass",
    "workshop",
    "bootcamp",
    "live session",
    "challenge",
    "competition"
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
    "monthly digest",
    "product update",
    "introducing",
    "connectors",
    "plugins"
  ];

  const genericCareerPhrases = [
    "resume tips",
    "resume guide",
    "career advice",
    "career tips",
    "career content"
  ];

  const educationMarketingPhrases = [
    "degree",
    "university",
    "course",
    "academy",
    "program"
  ];

  const educationMarketingSignals = [
    "enrol",
    "enroll",
    "admission",
    "learners",
    "premium",
    "free",
    "limited seats"
  ];

  return (
    hasAny(text, directPhrases) ||
    hasCombination(
      text,
      eventPhrases,
      eventSignals
    ) ||
    hasAny(text, newsletterPhrases) ||
    hasAny(text, genericCareerPhrases) ||
    hasCombination(
      text,
      educationMarketingPhrases,
      educationMarketingSignals
    )
  );
};

const isPromotionEmail = (text) => {
  return hasAny(text, [
    "limited time promotion",
    "discount offer",
    "special offer",
    "coupon",
    "buy now",
    "degree program",
    "online mca",
    "career acceleration platform",
    "academy pro",
    "enrol in",
    "enroll in",
    "premium career acceleration"
  ]);
};

const isNewsletterEmail = (text) => {
  return hasAny(text, [
    "newsletter",
    "weekly digest",
    "monthly digest",
    "product update",
    "plugin announcement",
    "introducing mongodb atlas",
    "mongodb atlas connectors",
    "connectors and plugins",
    "plugins for agents",
    "developer tools",
    "platform plugins",
    "new connectors"
  ]);
};

const getOpportunityScore = (type) => {
  const scores = {
    OFFER: 100,
    INTERVIEW: 95,
    ASSESSMENT: 90,
    APPLICATION: 75,
    RECRUITER_RESPONSE: 85,
    JOB: 65,
    COMPETITION: 50,
    REJECTION: 10,
    PROMOTION: 0,
    NEWSLETTER: 0,
    WEBINAR: 0,
    OTHER: 0
  };

  return scores[type] || 0;
};

const hasCareerOpportunitySignal = (text) => {
  return hasAny(text, [
    "job opportunity",
    "job opening",
    "role opening",
    "hiring",
    "we are hiring",
    "interview",
    "assessment",
    "coding challenge",
    "technical challenge",
    "application for",
    "thank you for applying",
    "offer letter",
    "selected for the role",
    "recruiter",
    "talent acquisition",
    "campus hiring",
    "internship",
    "hackathon",
    "challenge",
    "competition"
  ]);
};

const getPriority = (score) => {
  if (score >= 90) return "HIGH";
  if (score >= 65) return "MEDIUM";
  return "LOW";
};

const parseRecruiter = (from = "") => {
  const emailMatch =
    from.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

  const recruiterEmail =
    emailMatch ? emailMatch[0].toLowerCase() : "";

  const recruiterName =
    from
      .replace(/<[^>]+>/g, "")
      .replace(/"/g, "")
      .trim();

  return {
    recruiterEmail,
    recruiterName
  };
};

const classifyEmail = (email) => {

  const text = `
    ${email.subject}
    ${email.from}
    ${email.snippet}
    ${email.bodyText || ""}
  `.toLowerCase();

  let type = "OTHER";
  let source = "OTHER";
  let trust = "🟡 Needs Review";
  let organization = "UNKNOWN";

  // JOB TYPES

  if (
    isAccountSecurityEmail(text)
  ) {
    type = "OTHER";
  }

  else if (
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
    isOfferEmail(text)
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
    isApplicationEmail(text)
  ) {
    type = "APPLICATION";
  }

  else if (
    isCompetitionEmail(text)
  ) {
    type = "COMPETITION";
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
    isAccountSecurityEmail(text)
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
    if (type === "COMPETITION") {
      trust = "🟡 Needs Review";
    } else {
      type = isPromotionEmail(text)
        ? "PROMOTION"
        : isNewsletterEmail(text)
          ? "NEWSLETTER"
          : "OTHER";
      trust = "ðŸ”´ Filtered";
    }
  }

  const opportunityScore =
    getOpportunityScore(type);

  if (
    trust === "🟢 Trusted" &&
    (
      opportunityScore <= 0 ||
      !TRUSTED_OPPORTUNITY_TYPES.includes(type) ||
      !hasCareerOpportunitySignal(text)
    )
  ) {
    trust = "🟡 Needs Review";
  }

  const priority =
    getPriority(opportunityScore);

  const recruiter =
    parseRecruiter(email.from);

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
  organization,
  opportunityScore,
  priority,
  recruiterEmail:
    recruiter.recruiterEmail,
  recruiterName:
    recruiter.recruiterName
};
};

module.exports = classifyEmail;
