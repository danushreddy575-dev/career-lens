const skillsList = [
  "javascript",
  "node.js",
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
  "css"
];

const extractSkills = (text) => {

  const lowerText = text.toLowerCase();

  const extracted = skillsList.filter(skill =>
    lowerText.includes(skill)
  );

  return extracted;
};

module.exports = extractSkills;