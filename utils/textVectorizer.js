/*
WHY THIS EXISTS:
CareerLens ML-2 needs a tiny text vectorizer that can run inside the existing
Node.js backend without a Python service or paid ML API.

WHAT IT DOES:
It converts user/job text into TF-IDF vectors and compares them with cosine
similarity.

HOW IT WORKS:
TF-IDF gives higher weight to words that are important in one document but not
common everywhere. Cosine similarity then measures whether two weighted word
vectors point in a similar direction.
*/

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "the",
  "this",
  "to",
  "with",
  "you",
  "your"
]);

const tokenize = (text = "") => {
  return String(text || "")
    .toLowerCase()
    .replace(/node\.js/g, "nodejs")
    .replace(/next\.js/g, "nextjs")
    .replace(/react\.js/g, "react")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token =>
      token.length > 1 &&
      !STOP_WORDS.has(token)
    );
};

const termFrequency = (tokens) => {
  const counts = new Map();

  tokens.forEach(token => {
    counts.set(
      token,
      (counts.get(token) || 0) + 1
    );
  });

  return counts;
};

const buildIdf = (documents) => {
  const documentCount =
    documents.length || 1;

  const documentFrequency = new Map();

  documents.forEach(tokens => {
    const uniqueTokens =
      new Set(tokens);

    uniqueTokens.forEach(token => {
      documentFrequency.set(
        token,
        (documentFrequency.get(token) || 0) + 1
      );
    });
  });

  const idf = new Map();

  documentFrequency.forEach((count, token) => {
    idf.set(
      token,
      Math.log((documentCount + 1) / (count + 1)) + 1
    );
  });

  return idf;
};

const buildTfIdfVector = (tokens, idf) => {
  const tf = termFrequency(tokens);
  const vector = new Map();
  const tokenCount =
    tokens.length || 1;

  tf.forEach((count, token) => {
    vector.set(
      token,
      (count / tokenCount) *
        (idf.get(token) || 1)
    );
  });

  return vector;
};

const cosineSimilarity = (
  leftVector,
  rightVector
) => {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  leftVector.forEach((value, token) => {
    dotProduct +=
      value * (rightVector.get(token) || 0);
    leftMagnitude += value * value;
  });

  rightVector.forEach(value => {
    rightMagnitude += value * value;
  });

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dotProduct /
    (Math.sqrt(leftMagnitude) *
      Math.sqrt(rightMagnitude));
};

const vectorizeCorpus = (texts) => {
  const documents =
    texts.map(tokenize);

  const idf =
    buildIdf(documents);

  return documents.map(tokens =>
    buildTfIdfVector(tokens, idf)
  );
};

module.exports = {
  tokenize,
  vectorizeCorpus,
  cosineSimilarity
};
