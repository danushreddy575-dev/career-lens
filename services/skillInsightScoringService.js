const normalizeSkill = require("../utils/normalizeSkill");
const extractSkills = require("../utils/skillExtractor");

/*
WHY THIS EXISTS
CareerLens ML-4 should not only list missing skills. It should explain which
skills are worth learning next for this specific user.

WHAT IT DOES
This service scores missing skills using market demand, inbox opportunity
signals, location relevance, job freshness, apply-link availability, and how
often the skill appears beside the user's existing skills.

HOW IT WORKS
It is an explainable scoring model. Each job contributes weighted points to
skills the user does not already have. Higher quality and more relevant jobs
contribute more points, then the service ranks the skills and returns reasons.
*/

const IMPORTANT_EMAIL_TYPES = new Set([
  "JOB",
  "COMPETITION"
]);

const parseLocationParts = (location = "") =>
  String(location)
    .toLowerCase()
    .split(/[,|/]+/)
    .map(part => part.trim())
    .filter(Boolean);

const getLocationScore = (
  jobLocation = "",
  preferredLocation = ""
) => {
  const preferredParts =
    parseLocationParts(preferredLocation);

  if (preferredParts.length === 0) {
    return 0;
  }

  const normalizedJobLocation =
    String(jobLocation).toLowerCase();

  if (
    normalizedJobLocation.includes("remote") &&
    preferredParts.includes("remote")
  ) {
    return 12;
  }

  const matchedParts =
    preferredParts.filter(part =>
      normalizedJobLocation.includes(part)
    );

  if (matchedParts.length === 0) {
    return 0;
  }

  return matchedParts.length === preferredParts.length
    ? 18
    : 10;
};

const getFreshnessScore = (dateValue) => {
  if (!dateValue) {
    return 0;
  }

  const ageMs =
    Date.now() - new Date(dateValue).getTime();

  const ageDays =
    ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 3) return 12;
  if (ageDays <= 7) return 8;
  if (ageDays <= 14) return 4;

  return 0;
};

const getPriority = (score) => {
  if (score >= 70) return "High";
  if (score >= 38) return "Medium";
  return "Low";
};

const getJobSkillSet = (item) => {
  const text =
    `${item.title || ""} ${item.subject || ""} ${item.description || ""} ${item.snippet || ""}`;

  return [
    ...new Set([
      ...(item.skills || []),
      ...extractSkills(text)
    ]
      .map(normalizeSkill)
      .filter(Boolean))
  ];
};

const addSkillSignal = (
  skillMap,
  skill,
  {
    score,
    source,
    locationScore,
    hasApplyLink,
    coSkillMatches,
    title,
    company
  }
) => {
  if (!skillMap.has(skill)) {
    skillMap.set(skill, {
      skill,
      score: 0,
      demandCount: 0,
      locationMatches: 0,
      applyLinkJobs: 0,
      relatedMatches: 0,
      sources: new Set(),
      exampleJobs: []
    });
  }

  const current =
    skillMap.get(skill);

  current.score += score;
  current.demandCount += 1;
  current.locationMatches += locationScore > 0 ? 1 : 0;
  current.applyLinkJobs += hasApplyLink ? 1 : 0;
  current.relatedMatches += coSkillMatches;
  current.sources.add(source || "market");

  if (current.exampleJobs.length < 3) {
    current.exampleJobs.push({
      title,
      company
    });
  }
};

const buildReason = (item) => {
  const reasons = [];

  if (item.demandCount > 1) {
    reasons.push(`seen in ${item.demandCount} fresh opportunities`);
  } else {
    reasons.push("seen in a fresh opportunity");
  }

  if (item.locationMatches > 0) {
    reasons.push("matches your preferred location");
  }

  if (item.relatedMatches > 0) {
    reasons.push("appears with your current skills");
  }

  if (item.applyLinkJobs > 0) {
    reasons.push("has usable apply links");
  }

  return reasons.join(", ");
};

const scoreSkillsToLearn = ({
  userSkills = [],
  preferredLocation = "",
  jobs = [],
  emailJobs = [],
  limit = 20
}) => {
  const normalizedUserSkills =
    new Set(
      userSkills
        .map(normalizeSkill)
        .filter(Boolean)
    );

  const skillMap = new Map();

  jobs.forEach(job => {
    const jobSkills =
      getJobSkillSet(job);

    const coSkillMatches =
      jobSkills.filter(skill =>
        normalizedUserSkills.has(skill)
      ).length;

    const locationScore =
      getLocationScore(
        job.location,
        preferredLocation
      );

    const freshnessScore =
      getFreshnessScore(
        job.lastSeenAt || job.postedAt || job.createdAt
      );

    const hasApplyLink =
      Boolean(job.applyLink);

    jobSkills
      .filter(skill =>
        !normalizedUserSkills.has(skill)
      )
      .forEach(skill => {
        addSkillSignal(
          skillMap,
          skill,
          {
            score:
              15 +
              locationScore +
              freshnessScore +
              (hasApplyLink ? 10 : 0) +
              (coSkillMatches * 7),
            source: job.source,
            locationScore,
            hasApplyLink,
            coSkillMatches,
            title: job.title,
            company: job.company
          }
        );
      });
  });

  emailJobs
    .filter(emailJob =>
      IMPORTANT_EMAIL_TYPES.has(
        String(
          emailJob.mlType ||
          emailJob.type ||
          ""
        ).toUpperCase()
      ) &&
      emailJob.opportunityLink
    )
    .forEach(emailJob => {
      const emailSkills =
        getJobSkillSet(emailJob);

      const coSkillMatches =
        emailSkills.filter(skill =>
          normalizedUserSkills.has(skill)
        ).length;

      emailSkills
        .filter(skill =>
          !normalizedUserSkills.has(skill)
        )
        .forEach(skill => {
          addSkillSignal(
            skillMap,
            skill,
            {
              score:
                22 +
                (Number(emailJob.opportunityScore) || 0) / 5 +
                (coSkillMatches * 8),
              source: "inbox",
              locationScore: 0,
              hasApplyLink: true,
              coSkillMatches,
              title: emailJob.subject,
              company: emailJob.organization
            }
          );
        });
    });

  return [...skillMap.values()]
    .map(item => ({
      skill: item.skill,
      score: Math.round(item.score),
      priority: getPriority(item.score),
      demandCount: item.demandCount,
      locationMatches: item.locationMatches,
      applyLinkJobs: item.applyLinkJobs,
      relatedMatches: item.relatedMatches,
      sources: [...item.sources],
      reason: buildReason(item),
      exampleJobs: item.exampleJobs
    }))
    .sort((a, b) =>
      b.score - a.score ||
      b.demandCount - a.demandCount ||
      a.skill.localeCompare(b.skill)
    )
    .slice(0, limit);
};

module.exports = {
  scoreSkillsToLearn
};
