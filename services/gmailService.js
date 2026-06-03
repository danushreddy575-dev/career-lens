const { google } = require("googleapis");
const EmailConnection =require("../models/EmailConnection");
const EmailJob = require("../models/EmailJob");
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
  extractOpportunityLink,
  extractHrefLinks
} = require("../utils/linkExtractor");

const RECENT_GMAIL_SYNC_LIMIT = 50;

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

const generateAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly"
    ]
  });
};
 
const handleCallback = async (code, userId) => {
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
    profile.data.emailAddress;

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
          tokens.refresh_token || "",
        connected: true
      },
      {
        upsert: true,
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

    const classified =
      classifyEmail({
        id: msg.id,
        subject,
        from,
        snippet: message.data.snippet,
        opportunityLink
      });
    
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
        trust: classified.trust,
        opportunityLink:
          classified.opportunityLink || null
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
const getConnectionStatus = async () => {
  return false;
};

module.exports = {
  generateAuthUrl,
  handleCallback,
  getConnectionStatus,
  fetchEmails
};
