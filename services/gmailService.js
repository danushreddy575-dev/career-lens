const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const EmailConnection =require("../models/EmailConnection");
const EmailJob = require("../models/EmailJob");
const User = require("../models/User");
const {
  syncApplicationFromEmail
} = require(
  "./applicationSyncService"
);

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);
const classifyEmail =
  require("../utils/emailClassifier");
const {
  predictEmailType
} = require("./mlEmailClassifierService");
const {
  extractOpportunityLink,
  extractHrefLinks
} = require("../utils/linkExtractor");

const RECENT_GMAIL_SYNC_LIMIT = 50;
const ML_CONFIDENCE_THRESHOLD = 0.65;
const REVIEW_TRUST = "🟡 Needs Review";
const FILTERED_TRUST = "ðŸ”´ Filtered";

const TRUSTED_OPPORTUNITY_TYPES = [
  "OFFER",
  "INTERVIEW",
  "ASSESSMENT",
  "APPLICATION",
  "RECRUITER_RESPONSE",
  "JOB"
];

const ML_TYPE_SCORES = {
  OFFER: 100,
  INTERVIEW: 95,
  ASSESSMENT: 90,
  APPLICATION: 75,
  RECRUITER_RESPONSE: 85,
  JOB: 65,
  COMPETITION: 50,
  REJECTION: 10,
  NEWSLETTER: 0,
  WEBINAR: 0,
  PROMOTION: 0,
  OTHER: 0
};

const getPriorityFromScore = (score) => {
  if (score >= 90) return "HIGH";
  if (score >= 65) return "MEDIUM";
  return "LOW";
};

const getTrustFromMlType = (
  mlType,
  existingTrust
) => {
  if (
    [
      "NEWSLETTER",
      "WEBINAR",
      "PROMOTION"
    ].includes(mlType)
  ) {
    return FILTERED_TRUST;
  }

  if (mlType === "OTHER") {
    return REVIEW_TRUST;
  }

  if (mlType === "COMPETITION") {
    return REVIEW_TRUST;
  }

  return existingTrust;
};

const hasAny = (text, phrases) =>
  phrases.some(
    phrase => text.includes(phrase)
  );

const hasCareerOpportunitySignal = (text) => {
  return hasAny(text, [
    "job opportunity",
    "job opening",
    "role opening",
    "hiring",
    "we are hiring",
    "interview",
    "assessment",
    "coding challenge",
    "technical challenge",
    "application for",
    "thank you for applying",
    "offer letter",
    "selected for the role",
    "recruiter",
    "talent acquisition",
    "campus hiring",
    "internship",
    "hackathon",
    "challenge",
    "competition"
  ]);
};

const hasNonCareerAccountSignal = (text) => {
  return hasAny(text, [
    "terms and conditions",
    "terms & conditions",
    "schedule of charges",
    "savings account",
    "bank account",
    "credit card",
    "upi transaction",
    "monthly statement",
    "privacy policy",
    "terms of service",
    "subscription renewal",
    "order has shipped",
    "delivery update",
    "password reset",
    "verification code",
    "security alert",
    "oauth2 keys exposed",
    "third-party github application",
    "precision care challenge",
    "prize pool",
    "lakhs pool",
    "standout solution",
    "degree program",
    "online mca",
    "career acceleration platform",
    "academy pro",
    "enrol in",
    "enroll in",
    "premium career acceleration",
    "product update",
    "plugin announcement",
    "introducing mongodb atlas",
    "mongodb atlas connectors",
    "connectors and plugins",
    "plugins for agents",
    "developer tools",
    "platform plugins",
    "new connectors"
  ]);
};

const buildClassifierText = (email) => {
  return [
    email.subject,
    email.from,
    email.snippet,
    email.bodyText
  ]
    .join(" ")
    .toLowerCase();
};

const applyTrustGuardrails = (classified) => {
  const text = buildClassifierText(classified);
  const careerSignal =
    hasCareerOpportunitySignal(text);
  const nonCareerSignal =
    hasNonCareerAccountSignal(text);

  if (
    nonCareerSignal &&
    !careerSignal
  ) {
    const safeNonCareerType = [
      "NEWSLETTER",
      "WEBINAR",
      "PROMOTION",
      "COMPETITION"
    ].includes(classified.type)
      ? classified.type
      : "OTHER";

    return {
      ...classified,
      type: safeNonCareerType,
      trust: REVIEW_TRUST,
      opportunityScore: 0,
      priority: "LOW"
    };
  }

  if (
    classified.trust === "🟢 Trusted" &&
    (
      classified.opportunityScore <= 0 ||
      !TRUSTED_OPPORTUNITY_TYPES.includes(
        classified.type
      ) ||
      !careerSignal
    )
  ) {
    return {
      ...classified,
      trust: REVIEW_TRUST
    };
  }

  return classified;
};

const applyMlPrediction = (
  classified,
  mlPrediction
) => {
  if (!mlPrediction.available) {
    return applyTrustGuardrails({
      ...classified,
      mlType: null,
      mlConfidence: 0,
      classifierVersion: null,
      classificationSource: "RULE"
    });
  }

  const useMl =
    mlPrediction.type &&
    mlPrediction.confidence >=
      ML_CONFIDENCE_THRESHOLD;

  if (!useMl) {
    return applyTrustGuardrails({
      ...classified,
      mlType: mlPrediction.type,
      mlConfidence: mlPrediction.confidence,
      classifierVersion:
        mlPrediction.modelVersion,
      classificationSource: "ML_FALLBACK"
    });
  }

  const opportunityScore =
    ML_TYPE_SCORES[mlPrediction.type] || 0;

  return applyTrustGuardrails({
    ...classified,
    type: mlPrediction.type,
    trust:
      getTrustFromMlType(
        mlPrediction.type,
        classified.trust
      ),
    opportunityScore,
    priority:
      getPriorityFromScore(
        opportunityScore
      ),
    mlType: mlPrediction.type,
    mlConfidence: mlPrediction.confidence,
    classifierVersion:
      mlPrediction.modelVersion,
    classificationSource: "ML"
  });
};

const decodeBodyData = (data = "") => {
  if (!data) return "";

  const normalized = data
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Buffer
    .from(normalized, "base64")
    .toString("utf8");
};

const stripHtml = (html = "") => {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const collectBodyText = (part, bodies) => {
  if (!part) return;

  const bodyText =
    decodeBodyData(part.body?.data);

  if (
    bodyText &&
    part.mimeType === "text/plain"
  ) {
    bodies.plain.push(bodyText);
  }

  if (
    bodyText &&
    part.mimeType === "text/html"
  ) {
    bodies.html.push(stripHtml(bodyText));
    bodies.hrefs.push(
      ...extractHrefLinks(bodyText)
    );
  }

  (part.parts || []).forEach(
    child => collectBodyText(child, bodies)
  );
};

const getMessageBodyText = (payload) => {
  const bodies = {
    plain: [],
    html: [],
    hrefs: []
  };

  collectBodyText(payload, bodies);

  const visibleText =
    bodies.plain.join(" ") ||
    bodies.html.join(" ");

  return [
    [...new Set(bodies.hrefs)].join(" "),
    visibleText
  ].join(" ");
};

const generateAuthUrl = async (userId) => {
  const user =
    await User.findById(userId)
      .select("inboxEmail");

  const inboxEmail =
    String(user?.inboxEmail || "")
      .trim()
      .toLowerCase();

  if (!inboxEmail) {
    throw new Error(
      "Inbox Email is required before connecting Gmail."
    );
  }

  const state = jwt.sign(
    {
      id: userId,
      inboxEmail
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    login_hint: inboxEmail,
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly"
    ]
  });
};

const getUserIdFromAuthState = (state) => {
  return jwt.verify(
    state,
    process.env.JWT_SECRET
  );
};
 
const handleCallback = async (
  code,
  userId,
  intendedInboxEmail
) => {
  const { tokens } =
    await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client
  });

  const profile =
    await gmail.users.getProfile({
      userId: "me"
    });

  const email =
    String(
      profile.data.emailAddress || ""
    )
      .trim()
      .toLowerCase();

  const expectedEmail =
    String(intendedInboxEmail || "")
      .trim()
      .toLowerCase();

  if (email !== expectedEmail) {
    throw new Error(
      "Connected Gmail account does not match Inbox Email."
    );
  }

  const existingConnection =
    await EmailConnection.findOne({
      user: userId,
      provider: "gmail"
    });

  const connection =
    await EmailConnection.findOneAndUpdate(
      {
        user: userId,
        provider: "gmail"
      },
      {
        user: userId,
        email,
        provider: "gmail",
        accessToken:
          tokens.access_token || "",
        refreshToken:
          tokens.refresh_token ||
          existingConnection?.refreshToken ||
          "",
        connected: true
      },
      {
        upsert: true,
        new: true
      }
    );

  await User.findByIdAndUpdate(
    userId,
    {
      inboxEmail: email,
      gmailConnected: true,
      gmailConnectedAt: new Date()
    },
    {
      new: true
    }
  );

  return connection;
};
const fetchEmails = async (userId) => {

  const connection =
    await EmailConnection.findOne({
      user: userId,
      provider: "gmail",
      connected: true
    });

  if (!connection) {
    throw new Error("Gmail not connected");
  }

  const user =
    await User.findById(userId)
      .select(
        "inboxEmail gmailConnected"
      );

  const inboxEmail =
    String(user?.inboxEmail || "")
      .trim()
      .toLowerCase();

  const connectedEmail =
    String(connection.email || "")
      .trim()
      .toLowerCase();

  if (
    !user?.gmailConnected ||
    !inboxEmail ||
    inboxEmail !== connectedEmail
  ) {
    throw new Error("Gmail not connected");
  }

  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken
  });

  const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client
  });

  const messagesRes =
    await gmail.users.messages.list({
      userId: "me",
      maxResults: RECENT_GMAIL_SYNC_LIMIT
    });

  const messages =
    messagesRes.data.messages || [];

  const emails = [];

  for (const msg of messages) {

    const message =
      await gmail.users.messages.get({
        userId: "me",
        id: msg.id
      });

    const headers =
      message.data.payload.headers;

    const subject =
      headers.find(
        h => h.name === "Subject"
      )?.value || "";

    const from =
      headers.find(
        h => h.name === "From"
      )?.value || "";

    const bodyText =
      getMessageBodyText(
        message.data.payload
      );

    const emailText = [
      subject,
      from,
      message.data.snippet,
      bodyText
    ].join(" ");

    const opportunityLink =
      extractOpportunityLink(emailText);

    const ruleClassified =
      classifyEmail({
        id: msg.id,
        subject,
        from,
        snippet: message.data.snippet,
        bodyText,
        opportunityLink
      });

    const mlPrediction =
      predictEmailType(
        ruleClassified
      );

    const classified =
      applyMlPrediction(
        ruleClassified,
        mlPrediction
      );

    const interactionCount =
      classified.recruiterEmail
        ? await EmailJob.countDocuments({
            user: userId,
            recruiterEmail:
              classified.recruiterEmail
          }) + 1
        : 1;

    classified.interactionCount =
      interactionCount;
    
    await syncApplicationFromEmail(
      userId,
      classified
    );

    await EmailJob.findOneAndUpdate(
      {
        user: userId,
        emailId: msg.id
      },
      {
        user: userId,
        emailId: msg.id,

        subject: classified.subject,
        from: classified.from,
        snippet: classified.snippet,

        source: classified.source,
        organization: classified.organization,
        type: classified.type,
        mlType:
          classified.mlType,
        mlConfidence:
          classified.mlConfidence,
        classifierVersion:
          classified.classifierVersion,
        classificationSource:
          classified.classificationSource,
        trust: classified.trust,
        opportunityLink:
          classified.opportunityLink || null,
        opportunityScore:
          classified.opportunityScore,
        priority:
          classified.priority,
        recruiterEmail:
          classified.recruiterEmail,
        recruiterName:
          classified.recruiterName,
        interactionCount:
          classified.interactionCount
      },
      {
        upsert: true,
        new: true
      }
    );

    emails.push(classified);
      }

      return emails;
};
const getConnectionStatus = async (userId) => {
  const user =
    await User.findById(userId)
      .select(
        "inboxEmail gmailConnected gmailConnectedAt"
      );

  const connection =
    await EmailConnection.findOne({
      user: userId,
      provider: "gmail",
      connected: true,
      email: user?.inboxEmail || ""
    }).select(
      "createdAt updatedAt"
    );

  if (
    connection &&
    user &&
    !user.gmailConnected
  ) {
    user.gmailConnected = true;
    user.gmailConnectedAt =
      user.gmailConnectedAt ||
      connection.updatedAt ||
      connection.createdAt ||
      new Date();

    await user.save();
  }

  return {
    inboxEmail:
      user?.inboxEmail || "",
    gmailConnected:
      Boolean(connection),
    gmailConnectedAt:
      user?.gmailConnectedAt || null
  };
};

module.exports = {
  generateAuthUrl,
  getUserIdFromAuthState,
  handleCallback,
  getConnectionStatus,
  fetchEmails
};
