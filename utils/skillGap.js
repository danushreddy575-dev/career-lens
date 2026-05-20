const normalizeSkill = require("./normalizeSkill");

const analyzeSkillGap = (userSkills, jobSkills) => {

  const normalizedUserSkills = userSkills.map(normalizeSkill);
  const normalizedJobSkills = jobSkills.map(normalizeSkill);

  const matched = normalizedJobSkills.filter(skill =>
    normalizedUserSkills.includes(skill)
  );

  const missing = normalizedJobSkills.filter(skill =>
    !normalizedUserSkills.includes(skill)
  );

  const matchPercentage =
    normalizedJobSkills.length === 0
      ? 0
      : Math.round((matched.length / normalizedJobSkills.length) * 100);

  return {
    matched,
    missing,
    matchPercentage
  };
};

module.exports = analyzeSkillGap;