// WHY THIS EXISTS:
// CareerLens needs one consistent way to turn raw Gmail fields into text that
// both the training script and runtime classifier can understand.
//
// WHAT IT DOES:
// Combines subject, sender, snippet, and body text, then performs lightweight
// classical NLP cleaning.
//
// HOW IT WORKS:
// The function lowercases text, removes URLs and noisy punctuation, keeps
// useful email/domain characters, and collapses whitespace.

const cleanEmailText = (email = {}) => {
  return [
    email.subject || "",
    email.from || "",
    email.snippet || "",
    email.bodyText || ""
  ]
    .join(" ")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9@.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

module.exports = {
  cleanEmailText
};
