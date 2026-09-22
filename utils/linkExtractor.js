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
  "redirect_uri",
  "redirectUri",
  "url",
  "q",
  "u",
  "link",
  "to",
  "r",
  "target",
  "target_url",
  "targetUrl",
  "destination"
];

const BLOCKED_LINK_KEYWORDS = [
  "unsubscribe",
  "privacy",
  "terms",
  "preferences",
  "manage-email",
  "email-preference",
  "view-in-browser",
  "webversion"
];

const trimUrlJunk = (value = "") => {
  let cleaned =
    decodeHtmlEntities(value)
      .trim()
      .replace(/\\+$/g, "");

  while (
    cleaned &&
    /[)\].,;!?]+$/.test(cleaned)
  ) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
};

const isValidHttpUrl = (value = "") => {
  try {
    const url = new URL(value);
    return ["http:", "https:"]
      .includes(url.protocol);
  } catch (err) {
    return false;
  }
};

const isBlockedUtilityLink = (value = "") => {
  const lowerValue =
    value.toLowerCase();

  return BLOCKED_LINK_KEYWORDS
    .some(keyword =>
      lowerValue.includes(keyword)
    );
};

const extractOpportunityLink = (text = "") => {
  const urls = [
    ...new Set(
      (text.match(URL_REGEX) || [])
        .map(url =>
          extractTrackingDestination(url)
        )
        .map(trimUrlJunk)
        .filter(isValidHttpUrl)
        .filter(url =>
          !isBlockedUtilityLink(url)
        )
    )
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
    trimUrlJunk(
      decodeRepeatedly(href)
    );

  try {
    const url = new URL(decodedHref);

    for (const key of TRACKING_PARAM_KEYS) {
      const value =
        url.searchParams.get(key);

      if (
        value &&
        /^https?:\/\//i.test(value)
      ) {
        return trimUrlJunk(
          decodeRepeatedly(value)
        );
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
    return extractTrackingDestination(
      trimUrlJunk(cl0Match[1])
    );
  }

  const trackingPathMatch =
    decodedHref.match(
      /\/[A-Z0-9]{1,4}\/(https?:\/\/.+)$/i
    );

  if (trackingPathMatch) {
    return extractTrackingDestination(
      trimUrlJunk(trackingPathMatch[1])
    );
  }

  return trimUrlJunk(decodedHref);
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
      isValidHttpUrl(anchor.href) &&
      !isBlockedUtilityLink(anchor.href)
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
