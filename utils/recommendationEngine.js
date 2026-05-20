const normalizeSkill = require("./normalizeSkill");

const skillWeights = {
  nodejs: 5,
  react: 4,
  mongodb: 4,
  express: 4,
  javascript: 4,
  typescript: 4,
  docker: 3,
  kubernetes: 3,
  aws: 3,
  postgresql: 3,
  mysql: 2,
  graphql: 2,
  redis: 2,
  html: 1,
  css: 1,
  java: 4,
  spring: 4,
  springboot: 4,
  git: 1,
  linux: 2
};

const getWeight = (skill) => {
  return skillWeights[skill] || 1;
};

const recommendationEngine = (userSkills, job) => {
  const normalizedUserSkills = userSkills.map(normalizeSkill);

  const normalizedJobSkills = (job.skills || []).map(normalizeSkill);

  // Reject garbage jobs
  if (
    normalizedJobSkills.length === 0 ||
    !job.title ||
    job.title.trim().length < 5
  ) {
    return null;
  }

  const matched = normalizedJobSkills.filter(skill =>
    normalizedUserSkills.includes(skill)
  );

  const missing = normalizedJobSkills.filter(skill =>
    !normalizedUserSkills.includes(skill)
  );

  // Weighted score calculation
  const totalWeight = normalizedJobSkills.reduce(
    (sum, skill) => sum + getWeight(skill),
    0
  );

  const matchedWeight = matched.reduce(
    (sum, skill) => sum + getWeight(skill),
    0
  );

  let score =
    totalWeight === 0
      ? 0
      : Math.round((matchedWeight / totalWeight) * 100);

  const lowerTitle = job.title.toLowerCase();

  // Title relevance boost
  normalizedUserSkills.forEach(skill => {
    if (
      lowerTitle.includes(skill) ||
      lowerTitle.includes(skill.replace("js", ""))
    ) {
      score += 10;
    }
  });

  // Small boost for strong matches
  if (matched.length >= 3) {
    score += 5;
  }

  // Heavy penalty only when match is very weak
  if (matched.length === 0) {
    score -= 20;
  } else if (missing.length > matched.length) {
    score -= 5;
  }

  // Clamp between 0 and 100
  score = Math.max(0, Math.min(score, 100));

  // Reject extremely weak recommendations
  if (score < 20) {
    return null;
  }

  return {
    matched,
    missing,
    score
  };
};

module.exports = recommendationEngine;