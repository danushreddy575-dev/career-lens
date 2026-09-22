/*
WHY THIS EXISTS:
CareerLens ML-2 needs recommendations that understand text similarity, not only
exact skill overlap. This service keeps that logic outside the route.

WHAT IT DOES:
It ranks market jobs and Gmail inbox opportunities against the authenticated
user's profile using TF-IDF cosine similarity plus practical product signals.

HOW IT WORKS:
The user profile and every candidate job become text documents. TF-IDF vectors
are built for all documents together, cosine similarity compares each candidate
to the user vector, and deterministic boosts adjust for skill overlap,
location, source, and opportunity quality.
*/

const normalizeSkill = require("../utils/normalizeSkill");
const extractSkills = require("../utils/skillExtractor");
const {
  vectorizeCorpus,
  cosineSimilarity
} = require("../utils/textVectorizer");

const RECOMMENDABLE_EMAIL_TYPES = new Set([
  "JOB",
  "COMPETITION"
]);

const TRUSTED_MARKET_SOURCES = new Set([
  "adzuna",
  "jsearch",
  "collector",
  "manual"
]);

const parseLocationParts = (location = "") => {
  return String(location || "")
    .toLowerCase()
    .split(/[,\n;/|]+/)
    .map(part => part.trim())
    .filter(Boolean);
};

const normalizeList = (values = []) => {
  return [...new Set(
    values
      .filter(Boolean)
      .map(value => normalizeSkill(String(value)))
      .filter(Boolean)
  )];
};

const hasFilteredTrust = (value = "") => {
  return String(value || "")
    .toLowerCase()
    .includes("filtered");
};

const hasAny = (text, phrases) =>
  phrases.some(phrase =>
    text.includes(phrase)
  );

const isNonRecommendationEmail = (emailJob) => {
  const text = [
    emailJob.subject,
    emailJob.organization,
    emailJob.source,
    emailJob.type,
    emailJob.snippet
  ]
    .join(" ")
    .toLowerCase();

  return hasAny(text, [
    "introducing mongodb atlas",
    "mongodb atlas connectors",
    "connectors and plugins",
    "plugins for agents",
    "product update",
    "plugin announcement",
    "developer tools",
    "platform plugins",
    "new connectors",
    "newsletter",
    "webinar",
    "masterclass",
    "degree program",
    "online mca",
    "course",
    "academy pro",
    "terms and conditions",
    "schedule of charges",
    "savings account",
    "privacy policy"
  ]);
};

const buildUserProfileText = (
  user,
  requestedSkills
) => {
  const skills =
    normalizeList(
      requestedSkills?.length
        ? requestedSkills
        : user?.skills || []
    );

  return [
    skills.join(" "),
    user?.preferredJobType || "",
    user?.preferredLocation || ""
  ]
    .join(" ")
    .trim();
};

const buildMarketJobText = (job) => {
  return [
    job.title,
    job.company,
    job.location,
    job.experienceLevel,
    job.source,
    (job.skills || []).join(" "),
    job.description
  ].join(" ");
};

const buildEmailJobText = (emailJob) => {
  return [
    emailJob.subject,
    emailJob.organization,
    emailJob.source,
    emailJob.type,
    emailJob.priority,
    emailJob.snippet
  ].join(" ");
};

const getLocationScore = (
  jobLocation,
  preferredLocation
) => {
  const preferredParts =
    parseLocationParts(preferredLocation);

  const normalizedJobLocation =
    String(jobLocation || "")
      .toLowerCase();

  if (!preferredParts.length) {
    return normalizedJobLocation.includes("remote")
      ? 0.8
      : 0.35;
  }

  if (
    preferredParts.some(part =>
      normalizedJobLocation.includes(part)
    )
  ) {
    return 1;
  }

  if (
    normalizedJobLocation.includes("india") ||
    normalizedJobLocation.includes("remote")
  ) {
    return 0.55;
  }

  return 0.15;
};

const getSkillMatch = (
  userSkills,
  jobSkills
) => {
  const normalizedUserSkills =
    normalizeList(userSkills);

  const normalizedJobSkills =
    normalizeList(jobSkills);

  const matched =
    normalizedJobSkills.filter(skill =>
      normalizedUserSkills.includes(skill)
    );

  const missing =
    normalizedJobSkills.filter(skill =>
      !normalizedUserSkills.includes(skill)
    );

  const ratio =
    normalizedJobSkills.length
      ? matched.length / normalizedJobSkills.length
      : 0;

  return {
    matched,
    missing,
    ratio
  };
};

const getSourceScore = (source = "") => {
  return TRUSTED_MARKET_SOURCES.has(
    String(source || "").toLowerCase()
  )
    ? 1
    : 0.6;
};

const clampScore = (score) => {
  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
};

const buildReason = ({
  semanticScore,
  skillScore,
  locationScore,
  sourceType
}) => {
  if (skillScore >= 0.6) {
    return "Strong skill overlap";
  }

  if (semanticScore >= 0.45) {
    return "Similar to your profile";
  }

  if (locationScore >= 1) {
    return "Preferred location match";
  }

  if (sourceType === "email") {
    return "From your Gmail opportunities";
  }

  return "Relevant market role";
};

const buildMarketCandidates = (jobs) => {
  return jobs
    .filter(job =>
      Boolean(job.applyLink)
    )
    .map(job => ({
      sourceType: "market",
      original: job,
      text: buildMarketJobText(job),
      title: job.title,
      company: job.company,
      location: job.location,
      applyLink: job.applyLink,
      applySource: job.applySource,
      experienceLevel: job.experienceLevel,
      source: job.source,
      skillsRequired:
        normalizeList(job.skills || [])
    }));
};

const buildEmailCandidates = (emailJobs) => {
  return emailJobs
    .filter(emailJob =>
      Boolean(emailJob.opportunityLink)
    )
    .filter(emailJob =>
      RECOMMENDABLE_EMAIL_TYPES.has(
        emailJob.type
      )
    )
    .filter(emailJob =>
      !hasFilteredTrust(emailJob.trust)
    )
    .filter(emailJob =>
      !isNonRecommendationEmail(emailJob)
    )
    .filter(emailJob =>
      (emailJob.opportunityScore || 0) > 0
    )
    .map(emailJob => {
      const skillsRequired =
        extractSkills(
          `${emailJob.subject || ""} ${emailJob.snippet || ""}`
        );

      return {
        sourceType: "email",
        original: emailJob,
        text: buildEmailJobText(emailJob),
        title: emailJob.subject,
        company:
          emailJob.organization ||
          emailJob.source ||
          "Inbox Opportunity",
        location: "Inbox",
        applyLink: emailJob.opportunityLink,
        applySource: "Gmail Inbox",
        experienceLevel:
          emailJob.type === "COMPETITION"
            ? "Competition"
            : emailJob.priority,
        source: emailJob.source,
        emailType: emailJob.type,
        opportunityScore:
          emailJob.opportunityScore || 0,
        skillsRequired
      };
    });
};

const rankRecommendations = ({
  user,
  skills,
  jobs,
  emailJobs,
  limit = 10
}) => {
  const userSkills =
    normalizeList(
      skills?.length
        ? skills
        : user?.skills || []
    );

  const profileText =
    buildUserProfileText(user, userSkills);

  const candidates = [
    ...buildMarketCandidates(jobs),
    ...buildEmailCandidates(emailJobs)
  ];

  if (!profileText || !candidates.length) {
    return [];
  }

  const vectors =
    vectorizeCorpus([
      profileText,
      ...candidates.map(candidate =>
        candidate.text
      )
    ]);

  const userVector = vectors[0];

  return candidates
    .map((candidate, index) => {
      const semanticScore =
        cosineSimilarity(
          userVector,
          vectors[index + 1]
        );

      const skillMatch =
        getSkillMatch(
          userSkills,
          candidate.skillsRequired
        );

      const locationScore =
        candidate.sourceType === "market"
          ? getLocationScore(
              candidate.location,
              user?.preferredLocation
            )
          : 0.45;

      const sourceScore =
        candidate.sourceType === "market"
          ? getSourceScore(candidate.source)
          : 0.8;

      const linkScore =
        candidate.applyLink
          ? 1
          : 0;

      const inboxScore =
        candidate.sourceType === "email"
          ? Math.min(
              1,
              (candidate.opportunityScore || 0) / 100
            )
          : 0;

      const finalScore =
        clampScore(
          semanticScore * 38 +
          skillMatch.ratio * 30 +
          locationScore * 17 +
          sourceScore * 5 +
          linkScore * 5 +
          inboxScore * 5
        );

      return {
        jobId: candidate.original._id,
        sourceType: candidate.sourceType,
        title: candidate.title,
        company: candidate.company,
        location: candidate.location,
        applyLink: candidate.applyLink,
        applySource: candidate.applySource,
        source: candidate.source,
        emailType: candidate.emailType,
        experienceLevel: candidate.experienceLevel,
        skillsRequired: candidate.skillsRequired,
        matched: skillMatch.matched,
        missing: skillMatch.missing,
        semanticScore:
          Number(semanticScore.toFixed(3)),
        skillScore:
          Number(skillMatch.ratio.toFixed(3)),
        locationScore:
          Number(locationScore.toFixed(3)),
        recommendationScore: finalScore,
        whyRecommended: buildReason({
          semanticScore,
          skillScore: skillMatch.ratio,
          locationScore,
          sourceType: candidate.sourceType
        })
      };
    })
    .filter(item =>
      item.recommendationScore >= 20
    )
    .sort((a, b) =>
      b.recommendationScore -
        a.recommendationScore ||
      b.locationScore - a.locationScore ||
      b.skillScore - a.skillScore
    )
    .slice(0, limit);
};

module.exports = {
  rankRecommendations
};
