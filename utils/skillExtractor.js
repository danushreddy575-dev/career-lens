const normalizeSkill = require("./normalizeSkill");

const skillsList = [
  "javascript",
  "node.js",
  "nodejs",
  "react",
  "mongodb",
  "express",
  "docker",
  "kubernetes",
  "postgresql",
  "mysql",
  "python",
  "java",
  "aws",
  "html",
  "css",
  "typescript",
  "redis",
  "graphql",
  "next.js",
  "nestjs",
  "spring",
  "spring boot",
  "git",
  "linux"
];

const extractSkills = (text) => {
  const lowerText = text.toLowerCase();

  const found = skillsList
    .filter(skill => lowerText.includes(skill))
    .map(normalizeSkill);

  return [...new Set(found)];
};

module.exports = extractSkills;