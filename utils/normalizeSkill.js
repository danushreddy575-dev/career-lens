const normalizeSkill = (skill) => {
  return skill
    .toLowerCase()
    .replace(/\./g, "")     // node.js → nodejs
    .replace(/\s+/g, "")    // "machine learning" → "machinelearning"
    .trim();
};

module.exports = normalizeSkill;