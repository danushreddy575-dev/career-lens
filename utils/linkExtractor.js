const URL_REGEX =
  /(https?:\/\/[^\s<>"']+)/gi;

const PRIORITY_KEYWORDS = [
  "apply",
  "job",
  "career",
  "careers",
  "position",
  "opportunity",
  "greenhouse",
  "lever",
  "workday",
  "smartrecruiters",
  "ashby",
];

const BUTTON_TEXT_KEYWORDS = [
  "apply",
  "view opportunity",
  "opportunity",
  "view job",
  "job details",
  "register",
  "start application",
  "complete application"
];

const TRACKING_PARAM_KEYS = [
  "redirect",
  "redirect_url",
  "redirectUrl",
  "url",
  "u",
  "target",
  "destination"
];

const extractOpportunityLink = (text = "") => {
  const urls = [
    ...new Set(text.match(URL_REGEX) || [])
  ];

  if (!urls.length) return "";

  const priority = urls.find((url) =>
    PRIORITY_KEYWORDS.some((key) =>
      url.toLowerCase().includes(key)
    )
  );

  return priority || urls[0];
};

const decodeHtmlEntities = (text = "") => {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
};

const stripHtml = (html = "") => {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const decodeRepeatedly = (value = "") => {
  let decoded = value;

  for (let index = 0; index < 3; index += 1) {
    try {
      const next =
        decodeURIComponent(decoded);

      if (next === decoded) break;

      decoded = next;
    } catch (err) {
      break;
    }
  }

  return decoded;
};

const extractTrackingDestination = (href = "") => {
  const decodedHref =
    decodeRepeatedly(href);

  try {
    const url = new URL(decodedHref);

    for (const key of TRACKING_PARAM_KEYS) {
      const value =
        url.searchParams.get(key);

      if (
        value &&
        /^https?:\/\//i.test(value)
      ) {
        return decodeRepeatedly(value);
      }
    }
  } catch (err) {
    // Some email trackers contain encoded URLs in path segments.
  }

  const cl0Match =
    decodedHref.match(
      /\/CL0\/(https?:\/\/.+?)(?:\/\d+\/|$)/i
    );

  if (cl0Match) {
    return cl0Match[1];
  }

  return decodedHref;
};

const getAnchorLinks = (html = "") => {
  return [
    ...html.matchAll(
      /<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi
    )
  ]
    .map(match => {
      const href =
        decodeHtmlEntities(
          match[1] || match[2] || match[3] || ""
        ).trim();

      return {
        href: extractTrackingDestination(href),
        text: stripHtml(
          decodeHtmlEntities(match[4] || "")
        ).toLowerCase()
      };
    })
    .filter(anchor =>
      /^https?:\/\//i.test(anchor.href)
    );
};

const extractHrefLinks = (html = "") => {
  const anchors =
    getAnchorLinks(html);

  const priorityLinks =
    anchors
      .filter(anchor =>
        BUTTON_TEXT_KEYWORDS.some(keyword =>
          anchor.text.includes(keyword)
        )
      )
      .map(anchor => anchor.href);

  const otherLinks =
    anchors.map(anchor => anchor.href);

  return [
    ...new Set([
      ...priorityLinks,
      ...otherLinks
    ])
  ];
};

module.exports = {
  extractOpportunityLink,
  extractHrefLinks,
};
