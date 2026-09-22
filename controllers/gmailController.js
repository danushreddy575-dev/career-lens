const gmailService = require("../services/gmailService");

const EmailJob = require("../models/EmailJob");

const emailJobService =
  require("../services/emailJobService");

const getJobsByType = async (
  req,
  res,
  type
) => {
  try {

    const jobs =
      await emailJobService.getInboxJobs(
        req.user.id,
        { type }
      );

    return res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getInterviewJobs = async (
  req,
  res
) => {
  return getJobsByType(
    req,
    res,
    "INTERVIEW"
  );
};

exports.getApplicationJobs = async (
  req,
  res
) => {
  return getJobsByType(
    req,
    res,
    "APPLICATION"
  );
};

exports.getOfferJobs = async (
  req,
  res
) => {
  return getJobsByType(
    req,
    res,
    "OFFER"
  );
};

exports.getRejectionJobs = async (
  req,
  res
) => {
  return getJobsByType(
    req,
    res,
    "REJECTION"
  );
};

exports.getInboxJobs = async (req, res) => {
  try {

    const jobs = await EmailJob
      .find({
        user: req.user.id
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.connectGmail = async (req, res) => {
  try {
    const url =
      await gmailService.generateAuthUrl(
        req.user.id
      );

    res.status(200).json({
      success: true,
      authUrl: url
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.gmailCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    if (!code) {
      return res.redirect(
        `${clientUrl}/inbox?gmail=error&message=${encodeURIComponent(
          "Authorization code missing"
        )}`
      );
    }

    const { state } = req.query;

    if (!state) {
      return res.redirect(
        `${clientUrl}/inbox?gmail=error&message=${encodeURIComponent(
          "User context missing"
        )}`
      );
    }

    const authState =
      gmailService.getUserIdFromAuthState(
        state
      );

    await gmailService.handleCallback(
        code,
        authState.id,
        authState.inboxEmail
      );

    return res.redirect(
      `${clientUrl}/inbox?gmail=connected`
    );

  } catch (err) {
    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    return res.redirect(
      `${clientUrl}/inbox?gmail=error&message=${encodeURIComponent(
        err.message
      )}`
    );
  }
};

exports.connectionStatus = async (req, res) => {
  try {
    const status =
      await gmailService.getConnectionStatus(
        req.user.id
      );

    res.json({
      success: true,
      ...status
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getEmails = async (req, res) => {
  try {

    const emails =
      await gmailService.fetchEmails(
        req.user.id
      );

    res.status(200).json({
      success: true,
      count: emails.length,
      emails
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getTrustedJobs = async (req, res) => {
  try {

    const jobs =
      await emailJobService.getInboxJobs(
        req.user.id,
        {
          trust: "🟢 Trusted"
        }
      );

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getReviewJobs = async (req, res) => {
  try {

    const jobs =
      await emailJobService.getInboxJobs(
        req.user.id,
        {
          trust: "🟡 Needs Review"
        }
      );

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getFilteredJobs = async (req, res) => {
  try {

    const jobs =
      await emailJobService.getInboxJobs(
        req.user.id,
        {
          trust: "🔴 Filtered"
        }
      );

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getRecruiterInsights = async (req, res) => {
  try {

    const recruiters =
      await emailJobService
        .getRecruiterInsights(
          req.user.id
        );

    res.json({
      success: true,
      count: recruiters.length,
      recruiters
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};
