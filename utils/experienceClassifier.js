const classifyExperience = (text = "") => {
  const value =
    String(text).toLowerCase();

  if (
    /\bintern(ship)?\b/.test(value)
  ) {
    return "Internship";
  }

  if (
    /\bfresher\b|\bentry[-\s]?level\b|\bgraduate\b|\b0\s*[-+]\s*1\b|\b0\s*to\s*1\b/.test(value)
  ) {
    return "Entry Level";
  }

  if (
    /\bjunior\b|\bjr\.?\b|\b1\s*[-+]\s*2\b|\b1\s*to\s*2\b/.test(value)
  ) {
    return "Junior";
  }

  if (
    /\bsenior\b|\bsr\.?\b|\b5\+?\s*years?\b|\b5\s*[-+]\s*\d+\b/.test(value)
  ) {
    return "Senior";
  }

  if (
    /\blead\b|\bmanager\b|\barchitect\b|\bprincipal\b/.test(value)
  ) {
    return "Lead/Manager";
  }

  if (
    /\bmid[-\s]?level\b|\b2\s*[-+]\s*5\b|\b2\s*to\s*5\b|\b3\s*[-+]\s*5\b|\b3\s*to\s*5\b/.test(value)
  ) {
    return "Mid Level";
  }

  return "Not Specified";
};

module.exports = classifyExperience;
