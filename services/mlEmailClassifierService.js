// WHY THIS EXISTS:
// Adds a traditional Machine Learning email classifier to CareerLens without
// removing the current rule-based classifier.
//
// WHAT IT DOES:
// Loads an exported TF-IDF + Logistic Regression model and predicts the most
// likely email category with a confidence score.
//
// HOW IT WORKS:
// Runtime text is cleaned, transformed into TF-IDF features, passed through
// logistic-regression weights, and normalized with softmax probabilities.

const fs = require("fs");
const path = require("path");
const {
  cleanEmailText
} = require("../utils/emailTextPreprocessor");

const MODEL_PATH = path.join(
  __dirname,
  "../ml/email-classifier/models/email-classifier-v1.json"
);

let cachedModel = null;

const loadModel = () => {
  if (cachedModel) {
    return cachedModel;
  }

  if (!fs.existsSync(MODEL_PATH)) {
    return null;
  }

  cachedModel = JSON.parse(
    fs.readFileSync(MODEL_PATH, "utf8")
  );

  return cachedModel;
};

const tokenize = (text) => {
  return text
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
};

const buildNgrams = (
  tokens,
  ngramRange = [
    1,
    2
  ]
) => {
  const terms = [];
  const [
    minN,
    maxN
  ] = ngramRange;

  for (let n = minN; n <= maxN; n += 1) {
    for (
      let index = 0;
      index <= tokens.length - n;
      index += 1
    ) {
      terms.push(
        tokens
          .slice(index, index + n)
          .join(" ")
      );
    }
  }

  return terms;
};

const vectorizeText = (
  text,
  vocabulary,
  idf,
  ngramRange
) => {
  const tokens =
    tokenize(text);

  const terms =
    buildNgrams(
      tokens,
      ngramRange
    );

  const counts = {};

  terms.forEach(term => {
    counts[term] =
      (counts[term] || 0) + 1;
  });

  return vocabulary.map((term, index) => {
    const termFrequency =
      counts[term] || 0;

    return termFrequency * idf[index];
  });
};

const softmax = (scores) => {
  const maxScore =
    Math.max(...scores);

  const expScores =
    scores.map(score =>
      Math.exp(score - maxScore)
    );

  const total =
    expScores.reduce(
      (sum, score) => sum + score,
      0
    );

  return expScores.map(score =>
    score / total
  );
};

const predictEmailType = (email) => {
  const model =
    loadModel();

  if (!model) {
    return {
      type: null,
      confidence: 0,
      modelVersion: null,
      available: false
    };
  }

  const text =
    cleanEmailText(email);

  const vector =
    vectorizeText(
      text,
      model.vocabulary,
      model.idf,
      model.ngramRange || [
        1,
        2
      ]
    );

  const rawScores =
    model.classes.map((className, classIndex) => {
      const weights =
        model.weights[classIndex];

      return vector.reduce(
        (sum, value, index) =>
          sum + value * weights[index],
        model.bias[classIndex]
      );
    });

  const probabilities =
    softmax(rawScores);

  let bestIndex = 0;

  probabilities.forEach((probability, index) => {
    if (probability > probabilities[bestIndex]) {
      bestIndex = index;
    }
  });

  return {
    type: model.classes[bestIndex],
    confidence:
      Number(
        probabilities[bestIndex].toFixed(3)
      ),
    modelVersion: model.version,
    available: true
  };
};

module.exports = {
  predictEmailType
};
