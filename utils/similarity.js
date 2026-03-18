const stringSimilarity = require("string-similarity");

const isSimilar = (str1, str2) => {
  const similarity = stringSimilarity.compareTwoStrings(
    str1.toLowerCase(),
    str2.toLowerCase()
  );

  return similarity > 0.7;
};

module.exports = isSimilar;